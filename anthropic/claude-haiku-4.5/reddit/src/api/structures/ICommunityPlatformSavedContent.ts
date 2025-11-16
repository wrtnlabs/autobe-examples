import { tags } from "typia";

import { ICommunityPlatformPost } from "./ICommunityPlatformPost";
import { ICommunityPlatformComment } from "./ICommunityPlatformComment";

export namespace ICommunityPlatformSavedContent {
  /**
   * Search criteria, filtering parameters, sorting preferences, and
   * pagination options for retrieving a member's saved content collection.
   * This DTO enables members to organize and discover their bookmarked posts
   * and comments through comprehensive filtering and sorting capabilities.
   */
  export type IRequest = {
    /**
     * Page number for pagination, starting from 1. Determines which batch
     * of results to retrieve.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Number of saved content items to return per page. Maximum 100 items
     * per request to ensure performance.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

    /**
     * Full-text search query to filter saved content by user's personal
     * notes or content preview text. Search matches against saved item
     * notes and original content snippets.
     */
    search?: string | undefined;

    /**
     * Filter saved content by type: 'post' for saved posts only, 'comment'
     * for saved comments only, or 'all' for both types.
     */
    contentType?: "post" | "comment" | "all" | undefined;

    /**
     * Filter saved content by the original creator's username. Returns only
     * saved content created by this specific member.
     */
    creator?: string | undefined;

    /**
     * Filter saved content to items from a specific community by its unique
     * identifier.
     */
    communityId?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter saved content saved on or after this date in ISO 8601 format.
     * Used to find recently saved items.
     */
    saveDateFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter saved content saved on or before this date in ISO 8601 format.
     * Used to find items saved within a time range.
     */
    saveDateTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter saved content originally created on or after this date in ISO
     * 8601 format.
     */
    contentDateFrom?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter saved content originally created on or before this date in ISO
     * 8601 format.
     */
    contentDateTo?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Sort order for results: 'saveDate' (most recently saved first),
     * 'contentDate' (newest content first), or 'popularity' (highest vote
     * count first).
     */
    sortBy?: "saveDate" | "contentDate" | "popularity" | undefined;

    /**
     * Sort direction: 'asc' for ascending order or 'desc' for descending
     * order.
     */
    sortOrder?: "asc" | "desc" | undefined;
  };

  /**
   * Summary representation of saved content for display in member's
   * bookmarked collections.
   *
   * Provides essential information about a saved post or comment including
   * the type of content, preview information, and save metadata. Enables
   * efficient display of saved content lists with filtering and sorting
   * options.
   *
   * The actual saved content (post or comment) is referenced through the post
   * or comment property as a summary, with exactly one being non-null based
   * on the content_type discriminator. When content_type='post', post is
   * populated and comment is null. When content_type='comment', comment is
   * populated and post is null.
   *
   * This lightweight representation is suitable for rendering saved content
   * collections without excessive data transfer. The user_note field is
   * optional and may be null if the member did not provide a note when
   * bookmarking.
   */
  export type ISummary = {
    /**
     * Unique identifier for the saved content record.
     *
     * Primary key for this saved content entry. Used to reference this
     * specific bookmark in update or delete operations.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type of saved content: 'post' or 'comment'. Indicates what type of
     * content was bookmarked.
     *
     * Discriminator field determining which of the post or comment
     * reference is populated. When content_type='post', the post property
     * is non-null and comment is null. When content_type='comment', the
     * comment property is non-null and post is null.
     *
     * Always one of: 'post' or 'comment'.
     */
    content_type: string;

    /**
     * Summary of the saved post if content_type is 'post'. Contains full
     * post information including title, votes, creator, and community
     * context.
     *
     * Only populated when content_type='post'. Will be null when
     * content_type='comment'. Provides complete post context for display in
     * saved content collections.
     */
    post?: ICommunityPlatformPost.ISummary | null | undefined;

    /**
     * Summary of the saved comment if content_type is 'comment'. Contains
     * full comment information including content, votes, creator, and
     * parent post context.
     *
     * Only populated when content_type='comment'. Will be null when
     * content_type='post'. Provides complete comment context for display in
     * saved content collections.
     */
    comment?: ICommunityPlatformComment.ISummary | null | undefined;

    /**
     * Optional note or tag member added when saving (0-200 characters).
     * Allows member to remember why they saved this content.
     *
     * Userful for personal organization - member can add contextual notes
     * like 'reference for project', 'useful tutorial', or 'disagree with
     * perspective'. Can be null if no note was provided at save time. May
     * be updated independently of the saved content.
     */
    user_note?:
      | (string & tags.MinLength<0> & tags.MaxLength<200>)
      | null
      | undefined;

    /**
     * When content was saved. ISO 8601 UTC timestamp.
     *
     * Immutable timestamp set at creation. Used to sort saved items
     * chronologically or by recency of save. Enables filtering saved
     * collections by save date range.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
