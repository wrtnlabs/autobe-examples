import { tags } from "typia";

import { IDiscussionBoardMember } from "./IDiscussionBoardMember";
import { IDiscussionBoardCategory } from "./IDiscussionBoardCategory";
import { IDiscussionBoardTag } from "./IDiscussionBoardTag";

export namespace IDiscussionBoardSearchResult {
  /**
   * Summary view of an article used in search results and listings. Maps to
   * the Prisma model discussion_board_articles. This summary provides minimal
   * fields required to render a list item and includes belongs-to references
   * as .ISummary objects for context. Fields that are derived (excerpt,
   * thumbnail) are optional and presentation-only. Note: author is nullable
   * to reflect Prisma nullability when articles are anonymized or the author
   * was removed.
   */
  export type ISummary = {
    /** Unique identifier of the article (discussion_board_articles.id). */
    id: string & tags.Format<"uuid">;

    /** Article title (short form) used for listing and search snippets. */
    title: string;

    /**
     * Optional short excerpt or lead text derived from the article content
     * suitable for list display. This field is presentation-derived and may
     * be null when not computed.
     */
    excerpt?: string | null | undefined;

    /**
     * Optional author summary. Nullable to reflect Prisma column
     * discussion_board_member_id which is nullable (anonymized or removed
     * authors).
     */
    author?: IDiscussionBoardMember.ISummary | null | undefined;

    /**
     * Primary category for the article. Nullable when an article has no
     * assigned category.
     */
    category?: IDiscussionBoardCategory.ISummary | null | undefined;

    /**
     * Array of tag summaries applied to the article (classification). May
     * be an empty array when no tags are assigned. Server SHOULD return []
     * rather than omitting the property.
     */
    tags?: IDiscussionBoardTag.ISummary[] | undefined;

    /**
     * Whether the article is pinned in listing views (matches
     * discussion_board_articles.is_pinned).
     */
    is_pinned?: boolean | undefined;

    /**
     * Creation timestamp of the article in ISO 8601 UTC
     * (discussion_board_articles.created_at).
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Publication timestamp when the article became public. Null for
     * drafts.
     */
    published_at?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Optional thumbnail URL for the article (derived from attachments).
     * This field is presentation-only and may be null when no thumbnail
     * exists.
     */
    thumbnail?: (string & tags.Format<"uri">) | null | undefined;
  };
}
