export namespace IShoppingMallWishlistAlert {
  /**
   * Confirmation response for wishlist alert notifications triggered for
   * applicable items. This schema represents the success response returned
   * after the system processes alert requests for wishlist items based on
   * price reductions or stock availability changes. The response confirms
   * that notifications were successfully queued for delivery to the
   * authenticated user.
   *
   * This response does not include details about which specific items
   * triggered alerts, as the notification system handles delivery
   * asynchronously and may consolidate multiple alerts into single
   * notifications.
   *
   * Used exclusively in the response body of POST
   * /shoppingMall/wishlists/alerts operation to confirm successful alert
   * queueing.
   */
  export type IConfirm = {
    /**
     * Indicates the outcome of the alert notification request. "success"
     * means the system has queued the alert notifications for delivery to
     * the user. "failed" means the request could not be processed due to
     * system errors, rate limiting, or authentication issues. This field is
     * mandatory for all responses to ensure clients can reliably determine
     * the success state of the alert operation.
     */
    status: "success" | "failed";
  };
}
