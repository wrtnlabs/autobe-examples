import { tags } from "typia";

import { ICommunityPlatformDiscoveryItem } from "./ICommunityPlatformDiscoveryItem";

export namespace ICommunityPlatformDiscoveryFeedSection {
  /**
   * Summary information for a single section within a discovery feed.
   *
   * A section groups a small list of discovery items under a label such as
   * “Trending communities”, “Popular posts”, or “Because you follow X”. This
   * type is optimized for list and card rendering in discovery feeds.
   */
  export type ISummary = {
    /**
     * Stable identifier of the discovery section instance.
     *
     * Used for tracking impressions, clicks, and A/B testing of discovery
     * layouts.
     */
    id: string;

    /**
     * Human-readable title for the discovery section, such as “Trending
     * communities” or “Recommended for you”.
     */
    title: string;

    /**
     * Optional descriptive text that explains why this section is shown or
     * what it contains, such as “Based on communities you recently
     * joined”.
     */
    description?: string | undefined;

    /**
     * Machine-readable discriminator describing the semantic type of this
     * discovery section.
     *
     * Examples include values like "trending_communities", "popular_posts",
     * "recommended_communities", or "rising_posts". The exact allowed
     * values are defined by server-side discovery strategies.
     */
    kind: string & tags.MinLength<1>;

    /**
     * Ordered list of discovery items contained in this section.
     *
     * Items are intentionally summarized for efficient rendering, and
     * clients can navigate to full detail views (e.g., community page or
     * post detail) when an item is selected.
     */
    items: ICommunityPlatformDiscoveryItem.ISummary[];
  };
}
