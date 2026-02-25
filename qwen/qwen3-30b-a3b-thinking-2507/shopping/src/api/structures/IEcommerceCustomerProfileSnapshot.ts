import { tags } from "typia";

export namespace IEcommerceCustomerProfileSnapshot {
  /**
   * Summary of a customer's profile snapshot at a point in time, showing the display name, phone number, created timestamp, and modification timestamp.
   */
  export type ISummary = {
    /**
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property display_name
     */
    display_name?: string | null | undefined;
    /**
     * @x-autobe-database-schema-property phone_number
     */
    phone_number?: string | null | undefined;
    /**
     * @x-autobe-database-schema-property created_at
     */
    created_at: string & tags.Format<"date-time">;
    /**
     * @x-autobe-database-schema-property updated_at
     */
    updated_at: string & tags.Format<"date-time">;
    /**
     * @x-autobe-database-schema-property deleted_at
     */
    deleted_at?: (string & tags.Format<"date-time">) | null | undefined;
  };
}
