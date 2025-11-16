import { tags } from "typia";

import { IEconomicDiscussionCategory } from "./IEconomicDiscussionCategory";

export namespace IEconomicDiscussionSearch {
  /** Search request parameters for economic discussion content */
  export type IRequest = {
    /** Search query text (1-500 characters) */
    query: string & tags.MinLength<1> & tags.MaxLength<500>;

    /** Optional category filters, null for all categories */
    categories?:
      | (IEconomicDiscussionCategory.ISummary[] & tags.MaxItems<10>)
      | null
      | undefined;

    /** User authentication scope for result visibility */
    scope?: "all" | "member" | "moderator" | undefined;

    /** Result sorting strategy */
    sort_by?:
      | "relevance"
      | "created_at"
      | "updated_at"
      | "view_count"
      | undefined;

    /** Sort direction */
    order?: "asc" | "desc" | undefined;

    /** Page number starting from 1 */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /** Results per page (1-100) */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };
}
