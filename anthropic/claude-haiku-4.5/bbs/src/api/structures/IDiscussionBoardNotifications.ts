import { tags } from "typia";

export namespace IDiscussionBoardNotifications {
  /**
   * Request DTO for bulk marking multiple notifications as read. Accepts a
   * list of notification IDs belonging to the authenticated member.
   *
   * The operation validates that all provided notification IDs belong to the
   * authenticated member before executing any updates. If any notification ID
   * does not correspond to a notification owned by the authenticated user,
   * the entire request is rejected with a 403 Forbidden or 400 Bad Request
   * response, and no notifications are marked as read. This ensures atomicity
   * and prevents members from marking other users' notifications as read.
   *
   * This bulk operation improves efficiency when users want to clear their
   * unread notification count, such as when visiting their notification
   * inbox.
   */
  export type IReadBulkRequest = {
    /**
     * Array of notification IDs to mark as read. Each ID must be a valid
     * UUID format. All notifications must belong to the authenticated
     * member - if any notification ID does not correspond to the member's
     * own notification, the entire operation is rejected with authorization
     * error.
     */
    notification_ids: (string & tags.Format<"uuid">)[];
  };

  /**
   * Response confirming successful bulk marking of notifications as read.
   * Contains the count of notifications that were actually updated to read
   * status. This response indicates completion of the bulk read operation and
   * provides feedback on how many notifications were affected by the update.
   *
   * The response is returned after the system validates that all provided
   * notification IDs belong to the authenticated member and successfully
   * updates their is_read flags to true and populates the read_at timestamps
   * with the current server time in UTC.
   *
   * If no notifications were updated (for example, if all provided
   * notifications were already marked as read or none matched the specified
   * criteria), the system still returns a successful response with a count of
   * zero, indicating that the operation completed without errors but affected
   * no records.
   */
  export type IReadBulkResponse = {
    /**
     * The number of notifications that were successfully marked as read in
     * this bulk operation. This count reflects actual database updates
     * where the is_read flag was changed from false to true and the read_at
     * timestamp was populated with the current server time in ISO 8601 UTC
     * format. If all specified notifications were already marked as read,
     * this value will be zero, but the operation still returns
     * successfully. This value is always non-negative and represents the
     * actual number of rows modified in the discussion_board_notifications
     * table.
     */
    updated_count: number & tags.Type<"int32"> & tags.Minimum<0>;
  };
}
