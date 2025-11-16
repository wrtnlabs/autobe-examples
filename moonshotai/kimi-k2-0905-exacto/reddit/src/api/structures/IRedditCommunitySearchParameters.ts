import { tags } from "typia";

import { IRedditCommunityCommunityCategory } from "./IRedditCommunityCommunityCategory";
import { IRedditCommunityCommunityType } from "./IRedditCommunityCommunityType";
import { IRedditCommunityTag } from "./IRedditCommunityTag";
import { IRedditCommunitySortBy } from "./IRedditCommunitySortBy";
import { IRedditCommunitySortOrder } from "./IRedditCommunitySortOrder";

export namespace IRedditCommunitySearchParameters {
  /**
   * Search parameters configuration for filtering community content with
   * comprehensive query support and advanced search capabilities
   */
  export type ISummary = {
    /**
     * Filter by community category for targeted search results within
     * specific thematic groups
     */
    category?: IRedditCommunityCommunityCategory.ISummary | null | undefined;

    /**
     * Filter by community access type (public, private, restricted) based
     * on participation requirements
     */
    communityType?: IRedditCommunityCommunityType.ISummary | undefined;

    /** Array of tags and keywords to exclude from search results */
    excludedTags?: (IRedditCommunityTag[] & tags.MaxItems<20>) | undefined;

    /**
     * Search keyword or phrase used to filter content by title,
     * description, or content
     */
    query: string & tags.MinLength<1> & tags.MaxLength<500>;

    /**
     * Sorting criteria for search results (name, popularity, activity
     * level, creation date)
     */
    sortBy?: IRedditCommunitySortBy | undefined;

    /**
     * Sort direction (ascending or descending) applied to the selected sort
     * criteria
     */
    sortOrder?: IRedditCommunitySortOrder | undefined;

    /** Array of tags and keywords to include in search matching */
    tags?: (IRedditCommunityTag[] & tags.MaxItems<20>) | undefined;
  };
}
