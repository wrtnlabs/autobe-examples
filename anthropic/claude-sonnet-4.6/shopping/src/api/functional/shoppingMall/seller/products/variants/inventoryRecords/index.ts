import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallInventoryRecord } from "../../../../../../structures/IPageIShoppingMallInventoryRecord";
import { IShoppingMallInventoryRecord } from "../../../../../../structures/IShoppingMallInventoryRecord";

/**
 * Create a new manual inventory record for a specific product variant, adjusting its stock level by the specified quantity.
 *
 * This operation allows authenticated sellers to manually record stock changes for any variant belonging to their own products. There are two types of manual inventory records: a restock record (positive quantity, reason_type 'manual_restock') used when new units are received from a supplier or otherwise added to stock, and an adjustment record (negative quantity, reason_type 'manual_adjustment') used to account for damaged goods, losses, shrinkage, or other operational corrections.
 *
 * The current stock level of any variant is never stored as a single field in the database. Instead, it is always derived by summing all quantity values across every inventory record (shopping_mall_inventory_records) associated with that variant. Each record created by this endpoint contributes to that running total. A positive quantity increases the derived stock level; a negative quantity decreases it.
 *
 * Sellers may only create inventory records for variants that belong to their own products. The system validates that the product identified by productId is owned by the authenticated seller, and that the variant identified by variantId belongs to that product. If either condition fails, the request is rejected. Sellers cannot adjust inventory for another seller's variants.
 *
 * Providing a non-empty note is mandatory for every manual inventory record. The note must describe the reason for the stock change (e.g., 'Received new shipment from supplier', 'Damaged goods removed from warehouse stock'). A missing or empty note causes the request to be rejected. Zero quantity is also rejected — the quantity must be either strictly positive (for restocks) or strictly negative (for adjustments).
 *
 * The system additionally validates that a negative adjustment will not bring the variant's derived stock level below zero. If the requested negative quantity would result in a total stock below zero after summing all existing records, the request is rejected.
 *
 * Inventory records are immutable once created. The record produced by this operation cannot be edited or deleted at any future time, ensuring a permanent, tamper-proof audit trail of all stock movements.
 *
 * Related operations: Use `PATCH /shoppingMall/seller/products/{productId}/variants/{variantId}/inventoryRecords` to browse the full inventory history for the variant after creating a record. Automatic inventory records are also created by the system (not through this endpoint) when orders are placed (order_placement), when cancellations are approved (order_cancellation), or when refunds are approved (order_refund).
 *
 * @param props.connection
 * @param props.productId The UUID of the product that owns the target variant. Used to verify that the authenticated seller owns this product before allowing the inventory record to be created.
 * @param props.variantId The UUID of the product variant for which the inventory record will be created. Must belong to the product identified by productId.
 * @param props.body Manual inventory adjustment details including the signed quantity change and a mandatory human-readable note describing the reason for the stock movement.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification 1. Authentication & Authorization:
 *    - Verify the request is authenticated as a seller actor.
 *    - Retrieve the seller's ID from the session/token.
 *
 * 2. Ownership Validation:
 *    - Query shopping_mall_products to find the product with id = productId AND shopping_mall_seller_id = authenticated seller's ID AND deleted_at IS NULL.
 *    - If the product does not exist or does not belong to this seller, return 403 Forbidden.
 *    - Query shopping_mall_product_variants to confirm a variant with id = variantId AND shopping_mall_product_id = productId AND deleted_at IS NULL exists.
 *    - If the variant does not exist or does not belong to this product, return 404 Not Found.
 *
 * 3. Input Validation:
 *    - Validate that requestBody.quantity != 0. If zero, return 400 Bad Request.
 *    - Validate that requestBody.note is a non-empty string. If null or empty, return 400 Bad Request.
 *    - Determine reason_type based on quantity sign:
 *      * quantity > 0 → reason_type = 'manual_restock'
 *      * quantity < 0 → reason_type = 'manual_adjustment'
 *
 * 4. Stock Floor Check (for negative adjustments):
 *    - If quantity < 0, compute the current derived stock level:
 *      SELECT SUM(quantity) FROM shopping_mall_inventory_records WHERE shopping_mall_product_variant_id = variantId.
 *    - If currentStock + requestBody.quantity < 0, return 422 Unprocessable Entity (adjustment would bring stock below zero).
 *
 * 5. Record Creation:
 *    - Insert a new row into shopping_mall_inventory_records:
 *      * id: new UUID
 *      * shopping_mall_product_variant_id: variantId
 *      * quantity: requestBody.quantity
 *      * reason_type: determined in step 3
 *      * note: requestBody.note
 *      * created_at: current UTC timestamp
 *
 * 6. Response:
 *    - Return the newly created shopping_mall_inventory_records row as IShoppingMallInventoryRecord with HTTP 201.
 *
 * 7. Error Handling:
 *    - Product not found or not owned by seller → 403 Forbidden
 *    - Variant not found or not belonging to product → 404 Not Found
 *    - quantity == 0 → 400 Bad Request
 *    - note empty or missing → 400 Bad Request
 *    - stock would go negative → 422 Unprocessable Entity
 * @path /shoppingMall/seller/products/:productId/variants/:variantId/inventoryRecords
 * @accessor api.functional.shoppingMall.seller.products.variants.inventoryRecords.create
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
     * The UUID of the product that owns the target variant. Used to verify that the authenticated seller owns this product before allowing the inventory record to be created.
     */
    productId: string & tags.Format<"uuid">;

    /**
     * The UUID of the product variant for which the inventory record will be created. Must belong to the product identified by productId.
     */
    variantId: string & tags.Format<"uuid">;

    /**
     * Manual inventory adjustment details including the signed quantity change and a mandatory human-readable note describing the reason for the stock movement.
     */
    body: IShoppingMallInventoryRecord.ICreate;
  };
  export type Body = IShoppingMallInventoryRecord.ICreate;
  export type Response = IShoppingMallInventoryRecord;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/seller/products/:productId/variants/:variantId/inventoryRecords",
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
    `/shoppingMall/seller/products/${encodeURIComponent(props.productId ?? "null")}/variants/${encodeURIComponent(props.variantId ?? "null")}/inventoryRecords`;
  export const random = (): IShoppingMallInventoryRecord =>
    typia.random<IShoppingMallInventoryRecord>();
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
      assert.param("productId")(() => typia.assert(props.productId));
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

/**
 * Retrieve a paginated and filtered list of inventory records for a specific product variant.
 *
 * This operation returns the complete inventory history ledger for the identified variant, representing every stock movement event that has been recorded since the variant was created. Each entry in the history corresponds to a single `shopping_mall_inventory_records` row and includes the quantity change (positive for additions, negative for deductions), the reason type classification, the human-readable note (for manual operations), and the timestamp of the event.
 *
 * The inventory history encompasses all record types in a unified chronological log: manual restocks submitted by the seller (`manual_restock`), manual downward adjustments for loss or damage (`manual_adjustment`), automatic deductions generated when an order is placed (`order_placement`), and automatic restorations created when a cancellation or refund request is approved (`order_cancellation`, `order_refund`). All types are returned together without segregation so sellers can trace the full stock lifecycle of the variant.
 *
 * Access to this endpoint is restricted to authenticated sellers. The requesting seller must own the product identified by `productId`. The system validates that the product with the given `productId` exists, is owned by the authenticated seller, and that the variant identified by `variantId` belongs to that product. If either the product is not found, the product does not belong to the seller, or the variant does not belong to the product, the request is rejected.
 *
 * Results are returned in paginated form. The request body accepts optional filter criteria such as date range and reason type to narrow the history, as well as pagination parameters (page, limit) and sorting direction (ascending or descending by `created_at`). By default, records are returned in chronological order from earliest to most recent, matching the audit-trail reading expectation described in the domain requirements.
 *
 * This endpoint is typically used after retrieving the variant via `GET /shoppingMall/seller/products/{productId}/variants/{variantId}` to understand the current stock level context before examining the event-by-event history. The current stock level of the variant is always the sum of all `quantity` values in its inventory records, as the `shopping_mall_product_variants` table does not store a direct stock count column.
 *
 * @param props.connection
 * @param props.productId The UUID of the product that owns the target variant. Used to scope the request to a specific product and verify seller ownership.
 * @param props.variantId The UUID of the product variant whose inventory history is being retrieved. Must belong to the product identified by productId.
 * @param props.body Optional filter criteria and pagination parameters for the inventory record history query.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification 1. Authenticate the seller from the JWT session token.
 * 2. Look up the product by `productId` (UUID). If not found, return 404.
 * 3. Verify that the product's `shopping_mall_seller_id` matches the authenticated seller's ID. If not, return 403.
 * 4. Look up the variant by `variantId` (UUID) in `shopping_mall_product_variants`, filtering also by `shopping_mall_product_id = productId`. If not found or the variant belongs to a different product, return 404.
 * 5. Parse the request body for optional filter criteria:
 *    - `reasonTypes`: array of reason type strings to include (e.g., ['manual_restock', 'order_placement'])
 *    - `dateFrom` / `dateTo`: ISO datetime range filter applied on `created_at`
 *    - `page` and `limit`: pagination controls
 *    - `sort`: 'asc' or 'desc' by `created_at` (default 'asc')
 * 6. Query `shopping_mall_inventory_records` WHERE `shopping_mall_product_variant_id = variantId`, applying any active filters.
 * 7. Apply pagination using the composite index `(shopping_mall_product_variant_id, created_at)` for efficient ordered retrieval.
 * 8. Return results wrapped in a standard IPage envelope with pagination metadata (total count, current page, page size, total pages).
 * 9. Each record in the data array should include: `id`, `quantity`, `reason_type`, `note` (nullable), `created_at`.
 * 10. Records of reason types `order_placement`, `order_cancellation`, and `order_refund` will have `note = null`; this is expected and must be represented correctly in the response.
 * @path /shoppingMall/seller/products/:productId/variants/:variantId/inventoryRecords
 * @accessor api.functional.shoppingMall.seller.products.variants.inventoryRecords.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * The UUID of the product that owns the target variant. Used to scope the request to a specific product and verify seller ownership.
     */
    productId: string & tags.Format<"uuid">;

    /**
     * The UUID of the product variant whose inventory history is being retrieved. Must belong to the product identified by productId.
     */
    variantId: string & tags.Format<"uuid">;

    /**
     * Optional filter criteria and pagination parameters for the inventory record history query.
     */
    body: IShoppingMallInventoryRecord.IRequest;
  };
  export type Body = IShoppingMallInventoryRecord.IRequest;
  export type Response = IPageIShoppingMallInventoryRecord;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/seller/products/:productId/variants/:variantId/inventoryRecords",
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
    `/shoppingMall/seller/products/${encodeURIComponent(props.productId ?? "null")}/variants/${encodeURIComponent(props.variantId ?? "null")}/inventoryRecords`;
  export const random = (): IPageIShoppingMallInventoryRecord =>
    typia.random<IPageIShoppingMallInventoryRecord>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("productId")(() => typia.assert(props.productId));
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

/**
 * Retrieve a single inventory record for a specific product variant.
 *
 * This endpoint returns the full details of one inventory record identified by `recordId`, belonging to the product variant identified by `variantId`, which in turn belongs to the product identified by `productId`. Each inventory record in the `shopping_mall_inventory_records` table represents a discrete stock movement event — such as a manual restock, a manual operational adjustment, an automatic deduction from an order placement, or an automatic restoration from an approved cancellation or refund.
 *
 * The returned record includes the signed quantity change (positive for stock increases, negative for stock decreases), the categorized `reason_type` field that classifies the cause of the stock change into one of five values (`manual_restock`, `manual_adjustment`, `order_placement`, `order_cancellation`, `order_refund`), the optional `note` field containing the human-readable explanation provided by the seller for manual adjustments (null for system-generated records), and the `created_at` timestamp that establishes the chronological position of this event in the variant's full inventory history.
 *
 * Access to this endpoint is restricted to the authenticated seller who owns the product. The system verifies that the product identified by `productId` belongs to the requesting seller before returning any data. Attempts to access inventory records for variants belonging to another seller's product will be rejected. This ownership restriction mirrors the rules described in the seller ownership constraint for inventory operations.
 *
 * Inventory records are immutable and append-only by design. Once created, a record is never modified or deleted, ensuring the full audit trail of stock movements for a variant remains intact. There are no `updated_at` or `deleted_at` fields on inventory records.
 *
 * To retrieve the full list of inventory records for a variant in chronological order, use `GET /products/{productId}/variants/{variantId}/inventoryRecords`. To create a new manual inventory adjustment for a variant, use `POST /products/{productId}/variants/{variantId}/inventoryRecords`.
 *
 * @param props.connection
 * @param props.productId The UUID of the product that owns the target variant. Used to verify seller ownership before returning the inventory record.
 * @param props.variantId The UUID of the product variant whose inventory record is being retrieved. Must belong to the specified product.
 * @param props.recordId The UUID of the specific inventory record to retrieve. Must belong to the specified product variant.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification 1. Authenticate the requesting user as a seller.
 * 2. Fetch the product record from `shopping_mall_products` where `id = productId` and `deleted_at IS NULL`. If not found, return 404.
 * 3. Verify that `shopping_mall_products.shopping_mall_seller_id` matches the authenticated seller's ID. If not, return 403 Forbidden.
 * 4. Fetch the variant record from `shopping_mall_product_variants` where `id = variantId` AND `shopping_mall_product_id = productId` and `deleted_at IS NULL`. If not found, return 404.
 * 5. Fetch the inventory record from `shopping_mall_inventory_records` where `id = recordId` AND `shopping_mall_product_variant_id = variantId`. If not found, return 404.
 * 6. Return the full inventory record DTO including: id, shopping_mall_product_variant_id, quantity, reason_type, note (nullable), and created_at.
 * 7. No pagination or filtering needed — this is a single-record retrieval.
 * @path /shoppingMall/seller/products/:productId/variants/:variantId/inventoryRecords/:recordId
 * @accessor api.functional.shoppingMall.seller.products.variants.inventoryRecords.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * The UUID of the product that owns the target variant. Used to verify seller ownership before returning the inventory record.
     */
    productId: string & tags.Format<"uuid">;

    /**
     * The UUID of the product variant whose inventory record is being retrieved. Must belong to the specified product.
     */
    variantId: string & tags.Format<"uuid">;

    /**
     * The UUID of the specific inventory record to retrieve. Must belong to the specified product variant.
     */
    recordId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallInventoryRecord;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/seller/products/:productId/variants/:variantId/inventoryRecords/:recordId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/seller/products/${encodeURIComponent(props.productId ?? "null")}/variants/${encodeURIComponent(props.variantId ?? "null")}/inventoryRecords/${encodeURIComponent(props.recordId ?? "null")}`;
  export const random = (): IShoppingMallInventoryRecord =>
    typia.random<IShoppingMallInventoryRecord>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("productId")(() => typia.assert(props.productId));
      assert.param("variantId")(() => typia.assert(props.variantId));
      assert.param("recordId")(() => typia.assert(props.recordId));
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
