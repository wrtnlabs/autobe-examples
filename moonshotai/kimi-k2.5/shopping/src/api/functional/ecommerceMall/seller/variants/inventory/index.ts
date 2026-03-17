import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia from "typia";

import { IEcommerceMallInventoryRecord } from "../../../../../structures/IEcommerceMallInventoryRecord";

/**
 * Create a new inventory record for a product variant to manage stock quantities.
 *
 * This operation allows sellers to manually adjust the stock quantity of their product variants by creating inventory records. Sellers can perform two types of inventory entries:
 *
 * **Manual Restocking (Stock Addition)**
 * When adding stock, sellers specify a positive quantity value and provide a reason explaining the source of the new stock. Common reasons include receiving new shipments from suppliers, manufacturing completion, or returns of sellable merchandise. Upon creation, the inventory record stores the positive quantity change, reason, and timestamp, and the variant's calculated stock increases accordingly.
 *
 * **Manual Adjustment (Stock Subtraction)**
 * When removing stock, sellers specify a negative quantity value and provide a reason explaining the adjustment. Common reasons include inventory loss, damage, spoilage, internal use, or counting discrepancies discovered during physical inventory checks. Unlike automatic order stock deductions, manual adjustments are always accepted even if they would result in negative calculated stock. When stock becomes zero or negative, the variant is marked as out of stock for purchasing purposes. The inventory history preserves the record of the adjustment for audit purposes. Upon creation, the inventory record stores the negative quantity change, reason, and timestamp, and the variant's calculated stock decreases accordingly.
 *
 * **Validation and Constraints**
 * - The quantity change must not be zero (either positive or negative required)
 * - The reason text must not be empty
 * - Sellers can only create inventory records for variants belonging to their own products
 * - Adjustments resulting in negative stock are accepted (variant marked as out of stock) - this differs from automatic order deductions which reject when stock is insufficient
 *
 * **Related Operations**
 * - GET /variants/{variantId}/inventory - Retrieves the inventory history for a variant
 * - Automatic inventory records are created by the system for order placements (negative), cancellations (positive), and refunds (positive)
 *
 * Inventory records are permanent and immutable for audit purposes. Sellers cannot modify or delete existing inventory records once created.
 *
 * @param props.connection
 * @param props.variantId The unique identifier of the product variant to create an inventory record for (UUID format)
 * @param props.body Inventory entry details including the quantity change and reason for the adjustment
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Implementation steps for creating inventory records:
 *
 * 1. **Authentication and Authorization**
 *    - Verify the requesting user is authenticated as a seller
 *    - Validate that the variantId belongs to a product owned by the requesting seller
 *    - Return 403 Forbidden if the seller does not own the variant's product
 *
 * 2. **Request Validation**
 *    - Validate variantId is a valid UUID
 *    - Validate request body fields:
 *      - quantity: integer, must not be zero (positive for restocking, negative for adjustment)
 *      - reason: non-empty string describing the purpose of the inventory change
 *    - Return 400 Bad Request with specific error details for validation failures
 *
 * 3. **Stock Availability Check (for adjustments)**
 *    - If quantity is negative (adjustment), calculate current stock by summing all inventory records for this variant
 *    - Verify that current_stock + quantity >= 0 (cannot go below zero)
 *    - Return 422 Unprocessable Entity with error message if adjustment would result in negative stock
 *
 * 4. **Database Transaction**
 *    - Begin transaction to ensure atomicity
 *    - Insert new inventory record into ecommerce_mall_inventory_records table:
 *      - variantId: from path parameter
 *      - quantity: from request body (positive or negative integer)
 *      - reason: from request body
 *      - createdAt: current timestamp
 *    - Commit transaction
 *
 * 5. **Response Construction**
 *    - Retrieve the newly created inventory record with all fields
 *    - Return 201 Created with the inventory record in response body
 *    - Include Location header pointing to the inventory history endpoint
 *
 * **Edge Cases**
 * - Handle concurrent inventory updates by using database transaction isolation
 * - Ensure idempotency considerations for duplicate requests (optional: implement idempotency key)
 * - Log inventory changes for audit purposes
 *
 * **Database Schema Reference**
 * - Table: ecommerce_mall_inventory_records
 * - Fields: id (UUID), variantId (UUID, FK to product_variants), quantity (Int), reason (String), createdAt (DateTime)
 * @path /ecommerceMall/seller/variants/:variantId/inventory
 * @accessor api.functional.ecommerceMall.seller.variants.inventory.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * The unique identifier of the product variant to create an inventory record for (UUID format)
     */
    variantId: string;

    /**
     * Inventory entry details including the quantity change and reason for the adjustment
     */
    body: IEcommerceMallInventoryRecord.ICreate;
  };
  export type Body = IEcommerceMallInventoryRecord.ICreate;
  export type Response = IEcommerceMallInventoryRecord;

  export const METADATA = {
    method: "POST",
    path: "/ecommerceMall/seller/variants/:variantId/inventory",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/ecommerceMall/seller/variants/${encodeURIComponent(props.variantId ?? "null")}/inventory`;
  export const random = (): IEcommerceMallInventoryRecord =>
    typia.random<IEcommerceMallInventoryRecord>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("variantId")(() => typia.assert(props.variantId));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
