import { tags } from "typia";

export namespace IRedditCommunity {
  /**
   * Lightweight summary representation of a Reddit community for references
   * and embeddings.
   *
   * This DTO provides essential community information used when referencing
   * communities in posts, subscriptions, and navigation elements. It includes
   * key identity data (unique name and display title), visual customization
   * elements (icon and banner), descriptive content, activity metrics
   * (subscriber and post counts), and creation timestamp needed for display
   * in community lists and embedded references.
   *
   * Used as embedded references in posts, list items in community
   * directories, subscription feeds, and community discovery interfaces. The
   * inclusion of description, icon, and banner URLs enables rich visual
   * presentation in summary views while maintaining lightweight payload
   * size.
   */
  export type ISummary = {
    /**
     * Unique identifier for the community.
     *
     * Primary key used to reference this community across the platform in
     * relationships, API operations, and database queries.
     *
     * Generated as a UUID v4 value ensuring global uniqueness and
     * preventing ID collision across distributed systems.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique community name used in URLs and references.
     *
     * This is the URL-friendly identifier used in community URLs (e.g.,
     * /r/technology) and as a unique reference across the platform. Must be
     * unique across all communities to prevent conflicts.
     *
     * Constrained to 3-21 characters, lowercase alphanumeric and
     * underscores only. Immutable after creation to preserve URL stability
     * and prevent user confusion. This field corresponds to the "name"
     * column in the Prisma schema.
     */
    name: string;

    /**
     * Human-readable community title displayed in UI.
     *
     * Full community title shown in headers, navigation, community lists,
     * and user-facing interfaces. Provides a friendly, readable name that
     * may differ from the technical URL name. Supports Unicode characters
     * for international communities.
     *
     * Maximum 100 characters. Editable by moderators to refine community
     * presentation and branding. This field corresponds to the
     * "display_title" column in the Prisma schema.
     */
    display_title: string;

    /**
     * Community description explaining purpose, topic, and culture.
     *
     * Provides context about what the community is about, its focus areas,
     * and cultural guidelines. Displayed on community pages and in summary
     * views to help users understand community purpose before subscribing
     * or participating.
     *
     * Maximum 500 characters. Editable by moderators to evolve community
     * positioning and attract relevant members. Essential for community
     * discovery and user decision-making.
     */
    description: string;

    /**
     * Optional URL to community icon/avatar image.
     *
     * Displayed alongside community name throughout the platform including
     * community lists, post headers, subscription feeds, and navigation
     * elements. Provides visual identity and recognition.
     *
     * Null when no custom icon has been configured. Editable by community
     * moderators for visual customization and branding.
     */
    icon_url?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * Optional URL to community banner image.
     *
     * Displayed on community page headers and potentially in expanded
     * summary views. Provides visual identity and customization for
     * community branding.
     *
     * Null when no custom banner has been configured. Editable by community
     * moderators to enhance visual presentation.
     */
    banner_url?: (string & tags.Format<"uri">) | null | undefined;

    /**
     * Total number of members subscribed to this community.
     *
     * Denormalized count field maintained for efficient display in
     * community lists and search results without requiring expensive JOIN
     * operations.
     *
     * Automatically updated when subscriptions are created or deleted. Used
     * for popularity ranking, social proof, and community discovery
     * algorithms. Helps users assess community size and activity level.
     */
    subscriber_count: number & tags.Type<"int32">;

    /**
     * Total number of posts created in this community.
     *
     * Denormalized count field tracking all posts ever created in this
     * community. Incremented on post creation, decremented on post
     * deletion.
     *
     * Provides activity metrics for community discovery, helping users
     * assess community engagement level and content volume. Used in
     * combination with subscriber count to calculate engagement ratios and
     * identify active communities.
     */
    post_count: number & tags.Type<"int32">;

    /**
     * Timestamp when this community was created.
     *
     * Immutable creation timestamp used for calculating community age and
     * displaying tenure information in community profiles and discovery
     * interfaces.
     *
     * ISO 8601 format datetime value. Helps users assess community maturity
     * and historical context when deciding whether to join or participate.
     */
    created_at: string & tags.Format<"date-time">;
  };
}
