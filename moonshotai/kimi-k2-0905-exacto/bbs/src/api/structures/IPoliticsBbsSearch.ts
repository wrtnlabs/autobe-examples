import { tags } from "typia";

import { IDateRange } from "./IDateRange";

export namespace IPoliticsBbsSearch {
  /**
   * Request parameters for unified search across all discussion board content
   * including articles, comments, and user-generated content. This search
   * system utilizes PostgreSQL's full-text search capabilities with trigram
   * similarity matching combined with advanced filtering options to provide
   * comprehensive discovery of economic and political discussions across the
   * entire platform. The search mechanism supports temporal filtering,
   * category-based refinement, and multi-role content discovery to help users
   * find relevant policy analyses, economic discourse, and political
   * commentary with precision and efficiency.
   */
  export type IRequest = {
    /**
     * Search query text that will be processed through the database using
     * trigram similarity matching. This query supports natural language
     * input and will be tokenized for effective matching against article
     * titles, content, and comment text across the politicsBBS platform.
     */
    query: string & tags.MinLength<1> & tags.MaxLength<500>;

    /**
     * Page number for paginated search results, starting from 1 for the
     * first page of results. Used for navigation and state management in
     * the search interface.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Number of results per page, with sensible limits to ensure reasonable
     * response times. The system enforces both minimum and maximum values
     * to balance user experience with system performance.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>;

    /**
     * Optional content type filter to narrow search results allowing users
     * to focus on specific types of content or search across all content
     * types for comprehensive discovery of political and economic
     * discussions.
     */
    contentType?: "ARTICLE" | "COMMENT" | null | undefined;

    /**
     * Optional array of category identifiers to filter search results
     * within specific political or economic discussion categories enabling
     * targeted searching within particular policy areas or economic
     * topics.
     */
    categoryIds?:
      | ((string & tags.Format<"uuid">)[] &
          tags.MaxItems<20> &
          tags.UniqueItems)
      | undefined;

    /**
     * Optional date range filter to limit search results to specific time
     * periods enabling users to focus searches on recent discussions or
     * specific historical periods relevant to political developments.
     */
    dateRange?: IDateRange | null | undefined;

    /**
     * Optional array of user roles to filter search results by content
     * creator type enabling searching within specific user groups for
     * targeted discovery of political discourse contributions.
     */
    userRoles?: ("visitor"[] & tags.UniqueItems) | undefined;
  };
}
