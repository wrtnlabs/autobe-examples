import { tags } from "typia";

export namespace IRedditCommunityCommunityType {
  /**
   * Summarized community type classification for Reddit community access
   * controls, providing essential context about participation requirements
   * and visibility settings. This lightweight representation enables
   * efficient filter interfaces while maintaining complete information about
   * community access policies and user participation restrictions.
   */
  export type ISummary = {
    /** Unique identifier for the community type configuration */
    id: string & tags.Format<"uuid">;

    /** Community type identifier (public, private, restricted) */
    type_name: string;

    /** Complete explanation of access control and participation rules */
    description: string;

    /** User-friendly display name for this community type */
    display_name: string;

    /** Whether this community type is currently available for use */
    is_active: boolean;

    /**
     * Numeric privilege level indicating access restrictions (1=most open,
     * 3=most restricted)
     */
    privilege_level: number & tags.Type<"int32">;

    /** Additional configuration options specific to this community type */
    configuration_metadata?: string | undefined;

    /** Community type registration timestamp */
    created_at: string & tags.Format<"date-time">;

    /** Last modification timestamp */
    updated_at: string & tags.Format<"date-time">;
  };
}
