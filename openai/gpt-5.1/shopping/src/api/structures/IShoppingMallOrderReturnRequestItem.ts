import { tags } from "typia";

export namespace IShoppingMallOrderReturnRequestItem {
  /**
   * Nested DTO representing a single order line item entry within a new order
   * return request.
   *
   * Each instance identifies a specific order line from the parent order and
   * the number of units the customer is requesting to return for that line.
   * The backend validates that the referenced order line belongs to the order
   * identified in the path, that the line is eligible for returns according
   * to policy, and that the requested quantity does not exceed the allowed
   * limit.
   */
  export type ICreate = {
    /**
     * Unique identifier of the order line in the
     * `shopping_mall_order_lines` table that this return entry refers to.
     *
     * The backend uses this value to validate ownership, eligibility, and
     * maximum returnable quantities for the associated SKU snapshot.
     */
    order_line_id: string & tags.Format<"uuid">;

    /**
     * Number of units from the specified order line that the customer is
     * requesting to return.
     *
     * This value must be greater than zero and is subject to validation so
     * that it does not exceed the number of delivered units minus any
     * quantities already associated with previously approved or pending
     * return requests for the same order line.
     */
    quantity: number & tags.Type<"int32"> & tags.Minimum<1>;
  };

  /**
   * Nested DTO representing customer-editable updates for a single order line
   * entry within an existing order return request.
   *
   * This DTO allows modifications such as changing the requested quantity for
   * a specific order line, provided that the request is still in an editable
   * state and the new quantity respects all eligibility and policy
   * constraints.
   */
  export type IUpdate = {
    /**
     * Identifier of the order line in `shopping_mall_order_lines` that this
     * update entry targets.
     *
     * This value is used to match the update to an existing line-level
     * entry inside the return request. The server may interpret the absence
     * of this field according to its patch semantics, but when present it
     * must correspond to a valid line item for the return request.
     */
    order_line_id?: (string & tags.Format<"uuid">) | undefined;

    /**
     * Updated number of units from the referenced order line that the
     * customer is requesting to return.
     *
     * If provided, the value must be greater than zero and within the
     * allowable range for that order line based on delivered quantities and
     * prior returns.
     */
    quantity?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;
  };

  /**
   * Summary representation of a single line item that participates in an
   * order return request.
   *
   * Each instance describes the linkage to a specific order line in
   * `shopping_mall_order_lines` and the quantity from that line that is
   * included in the return request. It is designed for embedding inside
   * `IShoppingMallOrderReturnRequest` and related views without requiring an
   * additional API call to inspect the per-line breakdown.
   */
  export type ISummary = {
    /**
     * Identifier of the order line in the `shopping_mall_order_lines` table
     * that this return entry refers to.
     *
     * The parent order referenced by the `order` property on
     * `IShoppingMallOrderReturnRequest` contains the authoritative pricing
     * and fulfillment snapshot for this line.
     */
    order_line_id: string & tags.Format<"uuid">;

    /**
     * Number of units from the referenced order line that are included in
     * this return request.
     *
     * The value is always greater than or equal to one and is constrained
     * by the maximum number of units that have been delivered and not
     * previously returned for the same order line.
     */
    quantity: number & tags.Type<"int32"> & tags.Minimum<1>;
  };
}
