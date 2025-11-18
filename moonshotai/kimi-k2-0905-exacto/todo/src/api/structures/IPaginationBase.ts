import { tags } from "typia";

import { ISortOption } from "./ISortOption";

export namespace IPaginationBase {
  /**
   * Base pagination and filtering criteria for administrative and list
   * operations.
   *
   * Provides standardized pagination controls, search capabilities, and
   * sorting options that can be extended by specific entity request types.
   * This base structure ensures consistent querying patterns across different
   * administrative interfaces while allowing entity-specific filtering
   * extensions.
   */
  export type ICreate = {
    /**
     * Page number for paginated results, starting from 1. Used to navigate
     * through large sets of records efficiently.
     */
    page: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Number of results per page for pagination. Controls batch size for
     * data retrieval, typically set to reasonable values like 10-50.
     */
    limit: number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>;

    /**
     * Optional search query to filter results by text fields. Supports
     * wildcard matching for flexible searches.
     */
    search?: string | null | undefined;

    /** Field to sort results by. Supported options vary by entity type. */
    sortBy?: ISortOption | null | undefined;

    /**
     * Sorting direction for results. 'asc' for ascending order (default),
     * 'desc' for descending order.
     */
    sortOrder?: "asc" | "desc" | null | undefined;
  };
}
