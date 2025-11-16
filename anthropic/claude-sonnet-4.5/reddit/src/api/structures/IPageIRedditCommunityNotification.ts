import { IPage } from "./IPage";
import { IRedditCommunityNotification } from "./IRedditCommunityNotification";

export namespace IPageIRedditCommunityNotification {
  /**
   * Paginated response containing user notification summary records.
   *
   * This wrapper type encapsulates a page of notification data returned from
   * notification search and retrieval operations. It combines the actual
   * notification records with pagination metadata, enabling clients to
   * navigate through notification history efficiently.
   *
   * The pagination property provides essential metadata including current
   * page number, page size limit, total notification count, and total page
   * count. This information allows clients to implement infinite scroll,
   * pagination controls, unread count badges, and notification history
   * navigation.
   *
   * The data array contains the actual notification summary records for the
   * current page, with each element providing lightweight notification
   * information optimized for notification centers, notification feeds, and
   * real-time notification displays. The array length will not exceed the
   * configured page size limit (maximum 100 notifications per page).
   *
   * This response type is used by member operations that retrieve
   * notification lists, supporting comprehensive filtering by notification
   * type, read status, and date ranges. It enables efficient delivery of
   * notification streams while maintaining performance for users with large
   * notification histories.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IRedditCommunityNotification.ISummary[];
  };
}
