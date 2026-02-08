export namespace IShoppingMall {
  /**
   * Summary response for the API operation that resends failed notification deliveries. It communicates the counts of notifications considered, retried, skipped, and failed to the API consumer, along with the operation timestamp.
   */
  export type IResponse = {};

  /**
   * Request schema defining filters to select failed notification deliveries for resend attempts. Allows clients to reliably retry delivery of notifications that previously failed, specifying templates, user notifications, delivery status, and retry time windows.
   */
  export type IRequest = {};
}
