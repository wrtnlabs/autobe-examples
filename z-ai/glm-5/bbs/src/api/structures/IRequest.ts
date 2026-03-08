import { tags } from "typia";

export namespace IRequest {
  /**
   * Date range filter for query parameters. Provides optional start and end boundaries for filtering records by date fields. Both boundaries are inclusive, meaning records on the boundary dates are included in results. Omit either boundary for open-ended ranges.
   */
  export type IDateRange = {
    /**
     * Inclusive lower bound for date range filtering. Records with dates equal to or after this value are included in results.
     *
     * @x-autobe-specification Query parameter that maps to SQL WHERE clause as date_column >= 'from_value' (inclusive lower bound). Applied to the relevant date column (typically created_at) in the parent request context. Omit for open-ended ranges starting from earliest records. Expects ISO 8601 date-time format.
     */
    from?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Inclusive upper bound for date range filtering. Records with dates equal to or before this value are included in results.
     *
     * @x-autobe-specification Query parameter that maps to SQL WHERE clause as date_column <= 'to_value' (inclusive upper bound). Applied to the relevant date column (typically created_at) in the parent request context. Omit for open-ended ranges extending to most recent records. Expects ISO 8601 date-time format.
     */
    to?: (string & tags.Format<"date-time">) | undefined;
  };
}
