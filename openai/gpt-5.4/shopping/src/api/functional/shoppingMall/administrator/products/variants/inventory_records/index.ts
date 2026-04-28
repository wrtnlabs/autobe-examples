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
 * Retrieve a filtered and paginated inventory history for a specific product variant.
 *
 * This operation exposes the immutable stock movement ledger stored in `shopping_mall_inventory_records` for the variant identified by `variantId` under the product identified by `productId`. As described by the inventory record model, each row represents one atomic inventory change rather than a mutable stock balance, and the current stock position is derived by summing signed changes across preserved records. The response therefore lets an authorized caller review how the variant's stock changed over time through restocking, manual adjustment, order placement, cancellation restoration, refund restoration, or administrative correction.
 *
 * The endpoint is intended for business browsing rather than mutation. The requirements state that inventory history must be provided at the product variant level, that the full sequence of inventory records contributing to current stock must be visible, and that each history entry must show quantity change, reason, and recorded time. This API fulfills that requirement by returning a searchable and sortable list of ledger entries for one variant, enabling chronological review, dispute support, and reconciliation of current stock with the underlying movement history.
 *
 * Access is restricted to relevant parties only. Sellers may use this operation only for variants belonging to products they own, which aligns with the owner-only product variant management rules and the seller-specific inventory browsing expectations. Administrators may also use this operation for oversight. The service must never disclose one seller's inventory history to another seller, and it must verify both that the variant belongs to the specified product and that the product belongs to the requesting seller when the caller is a seller.
 *
 * This operation relies on the relationship chain documented in the database schema: `shopping_mall_inventory_records` belongs to `shopping_mall_product_variants`, and each variant belongs to `shopping_mall_products`. The product is the seller-owned catalog listing, while the variant is the SKU-level purchasable record identified by fields such as `sku_code`, `option_summary`, and optional `price`. Inventory is tracked only at the variant level, not directly on the product, so the path nesting clarifies the ownership and catalog context of the requested history.
 *
 * Clients typically use this endpoint after selecting a product and then one of its variants from variant management or stock management views. The returned paginated history can be used alongside variant detail retrieval and stock-adjustment operations to understand why current stock changed. If the provided product or variant identifiers are invalid, if the variant does not belong to the specified product, or if the caller is not authorized to view that seller-owned data, the operation must fail without revealing unrelated inventory information.
 *
 * @param props.connection
 * @param props.productId Target product identifier that owns the variant
 * @param props.variantId Target product variant identifier within the specified product
 * @param props.body Inventory history filters, pagination, and sorting options
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor administrator
 * @x-autobe-specification Implement a read-only inventory history query over
 *   `shopping_mall_inventory_records` scoped by both
 *   `shopping_mall_product_variants.id = :variantId` and
 *   `shopping_mall_product_variants.shopping_mall_product_id = :productId`.
 *
 * First, load the target variant from `shopping_mall_product_variants` joined to `shopping_mall_products` and verify that the variant belongs to the specified product. If no such pair exists, return a not-found error for the nested resource. For seller callers, also verify that `shopping_mall_products.shopping_mall_seller_id` matches the authenticated seller identity; reject access when the seller does not own the product. Administrators may bypass seller ownership filtering for oversight use cases.
 *
 * After authorization and nesting validation, query `shopping_mall_inventory_records` for rows whose `shopping_mall_product_variant_id` matches the validated variant id. Exclude logically removed rows by default with `deleted_at IS NULL` unless the platform's shared IRequest conventions explicitly support historical inclusion; if such inclusion is unsupported, always keep deleted rows excluded from the API result set. Support pagination from `IShoppingMallInventoryRecord.IRequest` and default sorting by `occurred_at` descending, with a secondary stable sort by `created_at` descending or `id` to keep pagination deterministic.
 *
 * Apply request-body filters only if they are present in `IShoppingMallInventoryRecord.IRequest` and only when those fields exist in the generated DTO schema. Typical supported filters should map to actual record fields, such as date-range filtering on `occurred_at`, keyword search on `reason`, and directional filtering based on `quantity_change` sign when the request DTO provides such options. Do not invent filters that are not represented in the DTO type. Return paginated summaries using `IPageIShoppingMallInventoryRecord.ISummary`.
 *
 * Each result item should expose enough information for history review, especially the record identifier, signed quantity change, business reason, and recorded timestamps. The service should ensure the list remains consistent with current stock calculation semantics by never rewriting ledger math during read operations. No transaction is required beyond the normal read consistency level unless the surrounding platform enforces a stronger snapshot isolation for paginated reads.
 *
 * Error handling must cover: missing product, missing variant, variant not belonging to the specified product, unauthorized seller access to another seller's product, and malformed pagination or filter values according to the request DTO schema. This operation must not create, edit, or remove inventory records; it is strictly a browsing endpoint for immutable ledger history.
 * @path /shoppingMall/administrator/products/:productId/variants/:variantId/inventory-records
 * @accessor api.functional.shoppingMall.administrator.products.variants.inventory_records.index
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
     * Target product identifier that owns the variant
     */
    productId: string & tags.Format<"uuid">;

    /**
     * Target product variant identifier within the specified product
     */
    variantId: string & tags.Format<"uuid">;

    /**
     * Inventory history filters, pagination, and sorting options
     */
    body: IShoppingMallInventoryRecord.IRequest;
  };
  export type Body = IShoppingMallInventoryRecord.IRequest;
  export type Response = IPageIShoppingMallInventoryRecord.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/administrator/products/:productId/variants/:variantId/inventory-records",
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
    `/shoppingMall/administrator/products/${encodeURIComponent(props.productId ?? "null")}/variants/${encodeURIComponent(props.variantId ?? "null")}/inventory-records`;
  export const random = (): IPageIShoppingMallInventoryRecord.ISummary =>
    typia.random<IPageIShoppingMallInventoryRecord.ISummary>();
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
 * Retrieve a single inventory history entry for a specific product variant.
 *
 * This operation returns one immutable stock movement ledger record belonging to the specified product variant under the specified product. In the underlying data model, inventory history is stored in `shopping_mall_inventory_records`, where each row captures one atomic inventory change such as restocking, manual adjustment, order placement, cancellation restoration, refund restoration, or administrative correction. The record includes the signed `quantity_change`, the business `reason`, and the `occurred_at` timestamp that determines when the movement contributes to the variant's stock ledger.
 *
 * The route is intentionally nested under both `products` and `variants` because inventory records are variant-level business artifacts, not standalone catalog resources. The implementation must confirm that the target variant in `shopping_mall_product_variants` belongs to the specified product in `shopping_mall_products`, and that the requested inventory record belongs to that same variant. This preserves the seller ownership boundary described for variant management and keeps inventory history review aligned with the correct parent merchandise record.
 *
 * This operation is primarily intended for seller inventory review and marketplace oversight. Sellers may inspect inventory history only for variants of products they own. Administrators and super administrators may inspect the same record for governance, dispute handling, or catalog oversight purposes. Customers should not have access because inventory history is internal stock-management data rather than customer-facing purchase information.
 *
 * The returned record should be interpreted as one entry within a broader immutable ledger rather than a mutable balance field. The current stock of a variant is derived from the full sequence of preserved inventory records, and this detail endpoint exposes one member of that sequence for audit and troubleshooting purposes. Clients typically use the variant inventory list operation first to browse all movements and then call this endpoint when they need the full details of a particular ledger entry.
 *
 * If the product, variant, or inventory record does not exist, or if the nesting relationship is inconsistent, the request must fail rather than returning unrelated data. Likewise, if a seller attempts to access a variant outside that seller's ownership scope, the operation must be rejected. These checks ensure the response remains consistent with the preserved inventory history and the calculated stock of the same product variant.
 *
 * @param props.connection
 * @param props.productId Target product's ID
 * @param props.variantId Target product variant's ID
 * @param props.inventoryRecordId Target inventory history record's ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor administrator
 * @x-autobe-specification Implement a read-only detail query for one
 *   `shopping_mall_inventory_records` row scoped by product, variant, and
 *   record identifiers.
 *
 * 1. Authenticate the caller and resolve actor type.
 * 2. Load the `shopping_mall_products` row by `productId`. If not found, return a not-found error.
 * 3. Load the `shopping_mall_product_variants` row by `variantId` with a predicate that `shopping_mall_product_id = productId`. If not found, return a not-found error because the variant is absent or does not belong to the specified product.
 * 4. Authorize access:
 *    - If the caller is a seller, verify the product's `shopping_mall_seller_id` matches the authenticated seller account. Reject when the seller does not own the product.
 *    - If the caller is an administrator or super administrator, allow read access for oversight.
 *    - Reject other actor types.
 * 5. Load the `shopping_mall_inventory_records` row by `inventoryRecordId` with a predicate that `shopping_mall_product_variant_id = variantId`. If not found, return a not-found error.
 * 6. Return the mapped `IShoppingMallInventoryRecord` response containing the inventory entry fields needed by clients, including identifier, parent variant reference, signed quantity change, business reason, occurred timestamp, and audit timestamps.
 *
 * Implementation notes:
 * - Treat inventory records as immutable audit entries. This operation must not modify `updated_at`, restore deleted rows, or recompute stock inside the record itself.
 * - If your service excludes logically removed records from normal browsing, add a `deleted_at IS NULL` predicate unless an administrator-only auditing policy explicitly requires otherwise. Keep behavior consistent with the rest of inventory-history retrieval in the service.
 * - Use a single transaction only if your authorization layer requires consistent reads across product, variant, and inventory record checks; otherwise a straightforward sequence of read queries is sufficient.
 * - Emit clear error branches for product mismatch, variant mismatch, inventory-record mismatch, and ownership violation so downstream tests can distinguish relationship failures from generic not-found conditions.
 * @path /shoppingMall/administrator/products/:productId/variants/:variantId/inventory-records/:inventoryRecordId
 * @accessor api.functional.shoppingMall.administrator.products.variants.inventory_records.at
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
     * Target product's ID
     */
    productId: string & tags.Format<"uuid">;

    /**
     * Target product variant's ID
     */
    variantId: string & tags.Format<"uuid">;

    /**
     * Target inventory history record's ID
     */
    inventoryRecordId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallInventoryRecord;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/administrator/products/:productId/variants/:variantId/inventory-records/:inventoryRecordId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/administrator/products/${encodeURIComponent(props.productId ?? "null")}/variants/${encodeURIComponent(props.variantId ?? "null")}/inventory-records/${encodeURIComponent(props.inventoryRecordId ?? "null")}`;
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
      assert.param("inventoryRecordId")(() =>
        typia.assert(props.inventoryRecordId),
      );
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
