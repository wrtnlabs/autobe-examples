import { tags } from "typia";

export namespace IRedditCommunityHelpDeskCategory {
  /**
   * Condensed representation of help desk categories enabling efficient
   * administrative oversight and categorization management of support
   * inquiries throughout the community platform. Provides essential category
   * information for listing interfaces and supports quick identification of
   * common inquiry types.
   */
  export type ISummary = {
    /** Unique database identifier for this help desk category record */
    id: string & tags.Format<"uuid">;

    /** Help desk category name used for display identification */
    name: string;

    /** Unique alphanumeric identifier for programmatic reference */
    code: string;

    /** Detailed explanation of help desk category scope and usage guidelines */
    description: string;

    /** Category activation status controlling availability for new inquiries */
    is_enabled: boolean;

    /** Visual styling color for user interface differentiation */
    color: string;

    /** Icon identifier for visual representation */
    icon: string;

    /** Numerical position for category ordering */
    sort_order: number & tags.Type<"int32"> & tags.Minimum<0>;

    /** Timestamp when this category was created */
    created_at?: (string & tags.Format<"date-time">) | undefined;

    /** Timestamp when this category was last updated */
    updated_at?: (string & tags.Format<"date-time">) | undefined;
  };
}
