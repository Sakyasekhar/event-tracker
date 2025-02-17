import { useState, useEffect, useCallback } from "react"
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom"
import { getAllEventsWithTrackerId, getTracker, deleteTracker, deleteEvent, addTracker, putTracker } from "../../IndexedDB/IndexedDB"
import { getLatestEventWithTrackerId } from "../../IndexedDB/IndexedDB"
import { getEventDate, timeSinceDateArray } from "../../DateHelperFunctions"
import Modal from "../../Shared/Bulma/Modal"

const Tracker = () => {
    
    // TODO: For all pages: if an ID is not included redirect to the trackers page.
    const [params] = useSearchParams()
    const trackerId = Number(params.get("id"))

    const navigate = useNavigate()

    const location = useLocation()
    const { referrer } = location.state || {}

    const [tracker, setTracker] = useState()
    const [editedTracker, setEditedTracker] = useState()
    const [latestEvent, setLatestEvent] = useState()
    const [events, setEvents] = useState()
    const [timeSinceArray, setTimeSinceArray] = useState()
    
    const [mode, setMode] = useState(!trackerId ? "create" : "view")
    const defaultReferrer = "/trackers"    // TODO: When trackers page is created set this to /trackers

    const [trackerDeleteModalIsActive, setTrackerDeleteModalIsActive] = useState(false)
    const [eventDeleteModalIsActive, setEventDeleteModalIsActive] = useState(false)
    const [eventToDelete, setEventToDelete] = useState({})


    const getAndSetTracker = useCallback(async (trackerId) => {

        getTracker(trackerId)
            .then(tracker => { 
                setTracker(tracker)
                setEditedTracker(tracker)
            })
            .catch(error => console.error(error))

    }, [])

    const getAndSetLatestEvent = useCallback(async (trackerId) => {

        getLatestEventWithTrackerId(trackerId)
            .then(event => setLatestEvent(event ? event : {}))
            .catch(error => console.error(error))

    }, [])

    const getAndSetEvents = useCallback(async (trackerId) => {

        getAllEventsWithTrackerId(trackerId)
            .then(events => setEvents(events))
            .catch(error => console.error(error))

    }, [])

    useEffect(() => {

        getAndSetTracker(trackerId)
        getAndSetLatestEvent(trackerId)
        getAndSetEvents(trackerId)

    }, [trackerId, getAndSetTracker, getAndSetLatestEvent, getAndSetEvents])

    useEffect(() => {

        // Don't do anything until the latestEvent has been set
        if (latestEvent) {

            // Update timeSinceArray for the first time
            setTimeSinceArray(timeSinceDateArray(getEventDate(latestEvent)))

            // Set an interval to update the timeSinceArray subsequent times
            const interval = setInterval(() => {
                setTimeSinceArray(timeSinceDateArray(getEventDate(latestEvent)))
            }, 1000)

            // Clean up the interval when the component unmounts
            return () => clearInterval(interval)

        }

    }, [latestEvent])

    const handleTrackerDelete = () => {

        deleteTracker(trackerId)
            .then(() => navigate(defaultReferrer))
            .catch(error => console.error(error))

    }

    const handleEventDeleteConfirm = (eventToDelete) => {

        setEventToDelete(eventToDelete)
        setEventDeleteModalIsActive(true)

    }

    const handleEventDelete = () => {

        deleteEvent(eventToDelete.id)
            .then(() => setEventDeleteModalIsActive(false))
            .then(() => getAllEventsWithTrackerId(trackerId))
            .then((events) => setEvents(events))
            .then(() => getAndSetLatestEvent(trackerId))   // Get and set the latest event in case it was just deleted
            .catch(error => console.error(error))

    }

    const handleSubmit = (submitEvent) => {

        submitEvent.preventDefault()

        if (mode === "create") {

            addTracker(editedTracker ?? {})
                .then(() => {

                    // If a referrer exists, navigate to it
                    navigate(referrer ?? defaultReferrer)

                })
                .catch(error => console.error(error))

        } else if (mode === "edit") {

            putTracker(editedTracker)
                .then(() => {
                    setMode("view")
                    setTracker(editedTracker)
                })
                .catch(error => console.error(error))

        }

    }

    return (
        <div>
            {/* Tracker delete modal */}
            {tracker && 
                <Modal
                    isActive={trackerDeleteModalIsActive}
                    setIsActive={setTrackerDeleteModalIsActive}
                    onAction={() => handleTrackerDelete()}
                    action="delete"
                    headerTitle="Delete tracker?"
                    bodyContent={
                        <div className="content">
                            <p>This will delete the {tracker.name ? `"${tracker.name}"` : ""} tracker and any of its tracked events.</p>
                            <p className="has-text-weight-bold">Please be certain that this is what you want to do as it cannot be undone!</p>
                        </div>
                    } 
                />
            }
            {/* Event delete modal */}
            {eventToDelete &&
                <Modal
                    isActive={eventDeleteModalIsActive}
                    setIsActive={setEventDeleteModalIsActive}
                    onAction={handleEventDelete}
                    action="delete"
                    headerTitle="Delete event?"
                    bodyContent={
                        <div className="content">
                            <p>This will delete the event that occurred on {eventToDelete.date} at {eventToDelete.time}{eventToDelete.description ? " with the following description:" : "."}</p>
                            <p>{eventToDelete.description}</p>
                            <p className="has-text-weight-bold">Please be certain that this is what you want to do as it cannot be undone!</p>
                        </div>
                    } 
                />
            }
            {tracker && <>
                <div className="content has-text-centered">
                    <h1>{tracker.name ?? <span className="is-italic">Unnamed Tracker</span>}</h1>
                </div>
                {timeSinceArray && <>
                    <div className="time-since has-text-centered is-flex is-justify-content-center">
                        {timeSinceArray && timeSinceArray.map((time, index) => (
                            <div className="mb-5 ml-5 mr-5" key={index}>
                                <p className="number is-size-1 has-text-weight-bold">{time.number}</p>
                                <p className="unit is-size-5">{time.unit}</p>
                            </div>
                        ))}
                    </div>
                    <div className="content has-text-centered is-size-4">
                        <p>
                            {timeSinceArray[timeSinceArray.length - 1].isPlural ? "have" : "has"} passed since {latestEvent ? "the" : "there is no"} {latestEvent ? <Link to={`/event?id=${latestEvent.id}`}>last event</Link> : "last event."}.
                        </p>            
                    </div>
                </>}
            </>}
            <div className="content mt-6">
                <h2>{mode !== "view" ? mode.charAt(0).toUpperCase() + mode.slice(1) + " " : ""}Tracker</h2>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="field">
                    <label className="label">Name</label>
                    <div className="control">
                        {mode === "view" && <p>{tracker?.name ?? <span className="is-italic">Unnamed Tracker</span>}</p>}
                        {mode !== "view" && 
                            <input 
                                type="text" 
                                className="input" 
                                defaultValue={tracker?.name}
                                onChange={(e) => setEditedTracker({...editedTracker, name: e.target.value})}
                            />
                        }
                    </div>
                </div>
                <div className="field is-grouped">
                    {mode === "view" && <>
                        <div className="control">
                            <button onClick={() => setMode("edit")} type="button" className="button">Edit</button>
                        </div>
                        <div className="control">
                            <button onClick={() => setTrackerDeleteModalIsActive(true)} type="button" className="button is-danger">Delete</button>
                        </div>
                    </>}
                    {mode === "edit" && <>
                        <div className="control">
                            <button onClick={() => setMode("view")} className="button" type="button">Cancel</button>
                        </div>
                        <div className="control">
                            <button className="button is-success">Save</button>
                        </div>
                    </>}
                    {mode === "create" && <>
                        <div className="control">
                            <button
                                onClick={() => navigate(referrer ? referrer : defaultReferrer)}
                                className="button"
                                type="button"
                            >Cancel</button>
                        </div>
                        <div className="control">
                            <button className="button is-success">Create</button>
                        </div>
                    </>}
                </div>
            </form>
            {tracker && <>
                <div className="content mt-6">
                    <h2>Events</h2>
                </div>
                <div className="buttons">
                    <Link to={`/event?trackerid=${trackerId}`} className="button is-warning">Log New Event</Link>
                </div>
                <table className="table is-fullwidth">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Description</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {events && events.map((eventObject, index) => {
                            return (
                                <tr key={index}>
                                    <td>{eventObject.date}</td>
                                    <td>{eventObject.time}</td>
                                    <td>{eventObject.description}</td>
                                    <td>
                                        <div className="buttons is-right">
                                            <Link to={`/event?id=${eventObject.id}`} className="button">View</Link>
                                            <button onClick={() => handleEventDeleteConfirm(eventObject)} className="button is-danger">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </>}
        </div>
    )

}

export default Tracker
