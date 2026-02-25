import { tags } from "typia";

import { IEcommerceAdministrator } from "./IEcommerceAdministrator";
import { IEcommerceCustomer } from "./IEcommerceCustomer";
import { IEcommerceSeller } from "./IEcommerceSeller";

export namespace IEcommerceVariantSnapshot {
  /**
   * Request parameters for searching and filtering variant snapshot records with pagination support.
   */
  export type IRequest = {
    /**
     * Filter by specific product variant ID
     */
    variant_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by customer who made the change
     */
    customer_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by seller who made the change
     */
    seller_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by administrator who made the change
     */
    administrator_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Filter by operation type (create, update, delete)
     */
    operation_type?: string | undefined;

    /**
     * Filter snapshots created after this date
     */
    start_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Filter snapshots created before this date
     */
    end_date?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Search term for change_reason field using LIKE operator
     */
    search?: string | undefined;

    /**
     * Page number for pagination
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Number of records per page
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /**
   * Summary view of a product variant snapshot record showing essential audit trail information including the change type, timestamp, actor, and key field modifications. Used in paginated listings of variant change history.
   */
  export type ISummary = {
    /**
     * Unique identifier of the snapshot record.
     *
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;

    /**
     * Timestamp when the snapshot was created.
     *
     * @x-autobe-database-schema-property created_at
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Type of operation that triggered the snapshot (create, update, delete).
     *
     * @x-autobe-database-schema-property operation_type
     */
    operation_type: string;

    /**
     * Reason or context provided for the variant change.
     *
     * @x-autobe-database-schema-property change_reason
     */
    change_reason: string | null;

    /**
     * Customer who made the change, if applicable.
     *
     * @x-autobe-database-schema-property customer
     */
    customer?: IEcommerceCustomer.ISummary | null | undefined;

    /**
     * Seller who made the change, if applicable.
     *
     * @x-autobe-database-schema-property seller
     */
    seller?: IEcommerceSeller.ISummary | null | undefined;

    /**
     * Administrator who made the change, if applicable.
     *
     * @x-autobe-database-schema-property administrator
     */
    administrator?: IEcommerceAdministrator.ISummary | null | undefined;

    /**
     * SKU code before the change.
     *
     * @x-autobe-database-schema-property previous_sku
     */
    previous_sku: string | null;

    /**
     * SKU code after the change.
     *
     * @x-autobe-database-schema-property current_sku
     */
    current_sku: string | null;

    /**
     * Variant price before the change.
     *
     * @x-autobe-database-schema-property previous_price
     */
    previous_price: number | null;

    /**
     * Variant price after the change.
     *
     * @x-autobe-database-schema-property current_price
     */
    current_price: number | null;
  };
}
