import { tags } from "typia";

export namespace ITodoAppGuestSession {
  /**
   * Paginated response for guest session lists.
   */
  export type ISummary = {
    /**
     * Pagination metadata for the guest session list.
     *
     * @x-autobe-specification Standard pagination metadata containing total count, page size (limit), offset, current page number, and hasNextPage flag.
     */
    pagination: {
      /**
       * Total number of sessions available
       */
      total: number & tags.Type<"int32">;

      /**
       * Number of sessions per page
       */
      limit: number & tags.Type<"int32">;

      /**
       * Starting position for pagination
       */
      offset: number & tags.Type<"int32">;

      /**
       * Current page number
       */
      page: number & tags.Type<"int32">;

      /**
       * Whether there are more pages available
       */
      hasNextPage: boolean;
    };

    /**
     * Array of guest session summary objects.
     *
     * @x-autobe-specification Array of ITodoAppGuestSession.ISummary objects representing the paginated guest sessions.
     */
    data: ITodoAppGuestSession.ISummary[];
  };
}
