import { tags } from "typia";

export namespace IRedditPlatformContent {
  /**
   * Summary representation of content entities used in moderation workflows.
   * Designed to provide essential context without exposing full content or
   * sensitive information, enabling efficient moderation while maintaining
   * user privacy. This type serves as the link between reports and their
   * corresponding content, ensuring modders can quickly identify and access
   * the reported content without unnecessary data exposure. The summary
   * includes key identifiers and a brief content preview for easy reference
   * during moderation processes.
   *
   * This schema aligns with Reddit Platform's moderation requirements for
   * handling reported content, providing exactly the information needed for
   * actionable moderation decisions. It follows the established pattern of
   * summary types seen in other entities like user profiles and community
   * summaries, maintaining consistent data patterns across the application.
   *
   * The implementation ensures that only essential information is exposed,
   * preventing sensitive data leakage while still providing adequate context
   * for moderators to make informed decisions about reported content.
   */
  export type ISummary = {
    /**
     * Unique identifier for the content entity, automatically generated
     * when the content is created. This ID follows standard UUID format to
     * ensure global uniqueness across the platform, eliminating ID
     * collisions and providing proper validation for API operations. The
     * field is required and immutable, meaning it cannot be changed after
     * creation.
     *
     * Authorization: This identifier is visible to all authorized users but
     * does not expose any confidential information about the content owner
     * or content specifics. It serves purely as a reference for API
     * operations and database relationships.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Type of content being referenced. Indicates whether the content is a
     * post or comment on the platform.
     *
     * Values: 'post' for user-created posts in communities, 'comment' for
     * user-submitted comments on posts.
     *
     * This field is critical for moderation workflows as it determines how
     * exactly the content should be handled, including which moderation
     * rules apply and which interfaces are appropriate for the content
     * type.
     *
     * The content_type field serves as a key descriptor for the type of
     * content being viewed, helping moderators identify what kind of
     * content they're examining.
     */
    content_type: "post" | "comment";

    /**
     * A shortened preview of the content that provides context without
     * exposing full content details. This is a truncated version of the
     * content that captures the essence for moderation purposes. The
     * snippet is limited to 200 characters to ensure brevity while
     * maintaining useful information.
     *
     * The snippet field is required for moderation efficiency, providing a
     * quick reference to the content without requiring moderators to open
     * the full content. It's designed to be displayed prominently in
     * moderation interfaces for rapid content identification.
     *
     * This field helps prevent information overload for moderators who need
     * to review large volumes of content quickly.
     */
    snippet: string & tags.MinLength<1> & tags.MaxLength<200>;
  };
}
