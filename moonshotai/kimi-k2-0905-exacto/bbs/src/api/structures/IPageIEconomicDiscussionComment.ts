import { IEconomicDiscussionComment } from "./IEconomicDiscussionComment";
import { IPage } from "./IPage";

export namespace IPageIEconomicDiscussionComment {
  /**
   * Paginated collection of economic discussion comments with author
   * attribution and discussion context.
   *
   * This pagination schema standardizes comment listing responses across the
   * economic discussion platform, providing essential comment data with
   * author information for threaded discussions. The structure supports
   * comment discovery, user activity feeds, and article discussion views with
   * comprehensive pagination controls.
   *
   * The schema integrates deeply with economic_discussion_comments table and
   * member relationships to deliver comment content with community reputation
   * context. Each comment summary includes moderation status, author
   * recognition, and discussion thread information for quality discourse
   * presentation.
   *
   * Pagination metadata enables efficient comment browsing through large
   * discussion threads while maintaining discussion cohesion. The format
   * supports both article-specific comment lists and cross-platform comment
   * discovery with consistent performance characteristics and user experience
   * patterns.
   */
  export type ISummary = {
    /**
     * Collection of economic discussion comment summaries with author
     * attribution. Each summary provides comment content excerpts, author
     * reputation metrics, discussion context, and moderation status for
     * quality community discourse presentation and user engagement tracking
     * across the platform.
     */
    data: IEconomicDiscussionComment.ISummary[];

    /**
     * Pagination metadata for comment browsing with discussion thread
     * context. Provides page positioning, result limits, and total
     * discussion scope enabling seamless navigation through comment threads
     * while maintaining conversation flow and discussion chronology for
     * optimal user engagement.
     */
    pagination: IPage.IPagination;
  };
}
