import { IPage } from "./IPage";
import { IRedditPlatformWebhookEndpoint } from "./IRedditPlatformWebhookEndpoint";

export namespace IPageIRedditPlatformWebhookEndpoint {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /**
     * Page information.
     *
     * @x-autobe-specification Pagination information for the page.
     */
    pagination: IPage.IPagination;

    /**
     * List of records.
     *
     * @x-autobe-specification List of records of type IRedditPlatformWebhookEndpoint.ISummary.
     */
    data: IRedditPlatformWebhookEndpoint.ISummary[];
  };
}
