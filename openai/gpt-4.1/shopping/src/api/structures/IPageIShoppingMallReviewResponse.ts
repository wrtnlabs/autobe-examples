import { IPage } from "./IPage";
import { IShoppingMallReviewResponse } from "./IShoppingMallReviewResponse";

export namespace IPageIShoppingMallReviewResponse {
  /**
   * Paginated result set for seller responses to customer reviews, as used in
   * admin, moderation, and seller dashboards for the shopping mall platform.
   *
   * This schema delivers a complete page of seller response summaries
   * (IShoppingMallReviewResponse.ISummary) with full context for display in
   * API contact center platforms, admin moderation workflows, and
   * transparency panels. The 'data' array contains the review responses
   * matching the current filter/search, always referencing response and
   * review context. A page may contain zero, one, or many records;
   * 'pagination' specifies current page info and total record/meta context.
   *
   * When empty, this page result accurately signals no response records met
   * the search criteria or the requested page is beyond available results.
   * API consumers rely on robust structure for list displays, moderation
   * queues, and multi-actor workflow integration. No record–or referencing
   * nested summary–in this result may ever break away from the canonical DTO
   * standard set elsewhere in the API.
   *
   * AutoBE Guarantee: All result rows conform to strong typing and business
   * integrity, supporting audit and abuse detection.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IShoppingMallReviewResponse.ISummary[];
  };
}
