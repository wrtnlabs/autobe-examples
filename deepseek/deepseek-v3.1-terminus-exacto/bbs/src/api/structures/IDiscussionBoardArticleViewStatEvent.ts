import { tags } from "typia";

import { IDiscussionBoardArticle } from "./IDiscussionBoardArticle";
import { IDiscussionBoardUserSession } from "./IDiscussionBoardUserSession";

export namespace IDiscussionBoardArticleViewStatEvent {
  /**
   * Request body for filtering article view statistic events. Supports date range filtering, view duration thresholds, and pagination controls for comprehensive analytics querying.
   */
  export type IRequest = {
    /**
     * Start timestamp for filtering view events by creation date range. Events created on or after this timestamp will be included.
     *
     * @x-autobe-specification Filter parameter for date range querying. Applied as WHERE created_at >= created_at_start when provided. Used for filtering view events by start timestamp boundary.
     */
    created_at_start?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * End timestamp for filtering view events by creation date range. Events created on or before this timestamp will be included.
     *
     * @x-autobe-specification Filter parameter for date range querying. Applied as WHERE created_at <= created_at_end when provided. Used for filtering view events by end timestamp boundary.
     */
    created_at_end?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Minimum view duration threshold for filtering events by engagement time. Events with duration greater than or equal to this value will be included.
     *
     * @x-autobe-specification Filter parameter for duration threshold querying. Applied as WHERE view_duration_seconds >= min_view_duration_seconds when provided. Used for filtering view events by minimum engagement duration.
     */
    min_view_duration_seconds?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | null
      | undefined;

    /**
     * Maximum view duration threshold for filtering events by engagement time. Events with duration less than or equal to this value will be included.
     *
     * @x-autobe-specification Filter parameter for duration threshold querying. Applied as WHERE view_duration_seconds <= max_view_duration_seconds when provided. Used for filtering view events by maximum engagement duration.
     */
    max_view_duration_seconds?:
      | (number & tags.Type<"int32"> & tags.Minimum<0>)
      | null
      | undefined;

    /**
     * Page number for paginated results (1-indexed). Controls which page of results to retrieve.
     *
     * @x-autobe-specification Pagination parameter for result set control. Used with limit to calculate OFFSET for database query: OFFSET = (page - 1) * limit.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of records to return per page. Controls the size of each result set.
     *
     * @x-autobe-specification Pagination parameter for result set control. Used with page to calculate OFFSET and LIMIT for database query: LIMIT = limit, OFFSET = (page - 1) * limit.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Summary information for article view statistic events, optimized for analytics display. Provides essential event data including timestamp, duration metrics, and session references for tracking article engagement patterns across the discussion board platform.
   */
  export type ISummary = {
    /**
     * Unique identifier for the view statistic event.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_article_view_stat_events.id. UUID primary key used for unique event identification.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the article view event was recorded.
     *
     * @x-autobe-database-schema-property created_at
     * @x-autobe-specification Direct mapping from discussion_board_article_view_stat_events.created_at. Records when the view event was captured for chronological analytics.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Duration of the view event in seconds, measuring how long the user engaged with the article content. Null indicates duration tracking was unavailable.
     *
     * @x-autobe-database-schema-property view_duration_seconds
     * @x-autobe-specification Direct mapping from discussion_board_article_view_stat_events.view_duration_seconds. Measures user engagement time with article content, nullable for events where duration tracking failed or wasn't applicable.
     */
    view_duration_seconds?: (number & tags.Type<"int32">) | null | undefined;

    /**
     * The article that was viewed, providing context for engagement analytics.
     *
     * @x-autobe-database-schema-property article
     * @x-autobe-specification Relation mapping via JOIN from discussion_board_article_view_stat_events.discussion_board_article_id to discussion_board_articles.id. Returns ISummary view with essential article identification information.
     */
    article?: IDiscussionBoardArticle.ISummary | undefined;

    /**
     * User session that generated the view event, providing connection context for analytics. Null indicates anonymous viewing or session-less tracking.
     *
     * @x-autobe-database-schema-property userSession
     * @x-autobe-specification Relation mapping via JOIN from discussion_board_article_view_stat_events.discussion_board_user_session_id to discussion_board_user_sessions.id. Returns ISummary view with session metadata. Nullable for anonymous views or session-less tracking.
     */
    userSession?: IDiscussionBoardUserSession.ISummary | null | undefined;
  };
}
