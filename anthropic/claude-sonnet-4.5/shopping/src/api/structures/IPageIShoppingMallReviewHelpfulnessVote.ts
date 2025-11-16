import { IPage } from "./IPage";
import { IShoppingMallReviewHelpfulnessVote } from "./IShoppingMallReviewHelpfulnessVote";

export namespace IPageIShoppingMallReviewHelpfulnessVote {
  /**
   * Paginated collection of helpfulness votes for a specific product review.
   *
   * This response structure contains a filtered and sorted list of votes
   * submitted by authenticated buyers indicating whether they found a review
   * helpful or not helpful. Each page includes both the vote records and
   * pagination metadata for navigating the complete voting history.
   *
   * Helpfulness votes serve a critical role in surfacing the most valuable
   * reviews to buyers by enabling community-driven quality assessment. High
   * helpful vote counts signal that a review provides useful, accurate
   * information that aids purchase decisions. This voting data directly
   * influences review ranking algorithms and visibility.
   *
   * Used in review analytics dashboards, moderation tools, and vote pattern
   * analysis where administrators and sellers need to understand community
   * perception of review quality. The pagination structure supports efficient
   * processing of large vote datasets for statistical analysis, fraud
   * detection, and credibility scoring.
   *
   * The data array contains vote summary information optimized for analytics
   * and display, including vote type (helpful/not helpful), voter identity,
   * and submission timestamps. This enables tracking of voting trends over
   * time and identification of suspicious voting patterns that might indicate
   * manipulation attempts.
   */
  export type ISummary = {
    /**
     * Pagination metadata for navigating through the helpfulness vote
     * collection.
     *
     * Provides information about the current page, total pages, total vote
     * records, and page size limits. Enables efficient analysis of voting
     * patterns by breaking large vote sets into manageable pages.
     *
     * Critical for implementing vote history browsing and determining the
     * scale of community engagement with a review.
     */
    pagination: IPage.IPagination;

    /**
     * Collection of helpfulness vote records in the current page.
     *
     * Contains the actual vote data matching the filter criteria, ordered
     * according to the specified sort parameters. Each item indicates
     * whether a buyer found the review helpful or not, along with vote
     * timestamp and identifier.
     */
    data: IShoppingMallReviewHelpfulnessVote.ISummary[];
  };
}
