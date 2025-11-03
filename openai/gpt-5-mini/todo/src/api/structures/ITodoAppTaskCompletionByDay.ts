import { tags } from "typia";

export namespace ITodoAppTaskCompletionByDay {
  /**
   * Aggregate summary of task completions grouped by calendar day. This is a
   * computed/reporting DTO (not a direct Prisma model). `date` is a calendar
   * date in the ISO 8601 'YYYY-MM-DD' form representing the aggregation day;
   * servers should document whether the date is normalized to UTC or the
   * user's calendar zone. For large aggregates `completedTaskIds` may be
   * omitted to avoid excessive payload sizes.
   */
  export type ISummary = {
    /**
     * Calendar date for the aggregation day in YYYY-MM-DD format. Pattern
     * enforces zero-padded year-month-day. Server SHOULD document whether
     * this represents UTC calendar day or user-local day; clients should
     * assume UTC unless otherwise specified by API docs.
     */
    date: string & tags.Pattern<"^[0-9]{4}-[0-9]{2}-[0-9]{2}$">;

    /**
     * Number of tasks that transitioned to completed on the given date.
     * Count excludes soft-deleted tasks and represents final state
     * transitions that occurred within the aggregation window.
     */
    completedCount: number & tags.Type<"int32">;

    /**
     * Optional list of task UUIDs completed on that date. Present only when
     * the consumer requests detailed ids; servers may omit this field for
     * large aggregates or when privacy/performance constraints apply.
     */
    completedTaskIds?: (string & tags.Format<"uuid">)[] | undefined;
  };
}
