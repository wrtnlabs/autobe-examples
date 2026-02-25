import { tags } from "typia";

export namespace ITodoAppHistory {
  /**
   * Summary of a todo edit history entry, showing the timestamp of the edit and previous values of edited fields for UI display. Excludes large text content to maintain lightweight response.
   */
  export type ISummary = {
    /**
     * Unique history entry identifier
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Unique history entry identifier from id column
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp of when the edit was made
     *
     * @x-autobe-database-schema-property todo
     * @x-autobe-specification Edit timestamp stored in history (ISO 8601)
     */
    timestamp: string & tags.Format<"date-time">;

    /**
     * Previous title before edit
     *
     * @x-autobe-database-schema-property title
     * @x-autobe-specification Previous title value before edit (null if unchanged)
     */
    title?: string | null | undefined;

    /**
     * Previous description before edit
     *
     * @x-autobe-database-schema-property description
     * @x-autobe-specification Previous description before edit (null if unchanged)
     */
    description?: string | null | undefined;

    /**
     * Previous start date before edit
     *
     * @x-autobe-database-schema-property start_date
     * @x-autobe-specification Previous start date before edit (null if unchanged)
     */
    start_date?: (string & tags.Format<"date-time">) | null | undefined;

    /**
     * Previous due date before edit
     *
     * @x-autobe-database-schema-property due_date
     * @x-autobe-specification Previous due date before edit (null if unchanged)
     */
    due_date?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
