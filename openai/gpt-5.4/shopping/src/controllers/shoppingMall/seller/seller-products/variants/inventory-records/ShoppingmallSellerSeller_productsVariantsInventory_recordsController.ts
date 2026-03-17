import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallInventoryRecord } from "../../../../../../api/structures/IPageIShoppingMallInventoryRecord";
import { IShoppingMallInventoryRecord } from "../../../../../../api/structures/IShoppingMallInventoryRecord";
import { SellerAuth } from "../../../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../../../decorators/payload/SellerPayload";
import { getShoppingMallSellerSellerProductsProductIdVariantsVariantIdInventoryRecordsInventoryRecordId } from "../../../../../../providers/getShoppingMallSellerSellerProductsProductIdVariantsVariantIdInventoryRecordsInventoryRecordId";
import { patchShoppingMallSellerSellerProductsProductIdVariantsVariantIdInventoryRecords } from "../../../../../../providers/patchShoppingMallSellerSellerProductsProductIdVariantsVariantIdInventoryRecords";
import { postShoppingMallSellerSellerProductsProductIdVariantsVariantIdInventoryRecords } from "../../../../../../providers/postShoppingMallSellerSellerProductsProductIdVariantsVariantIdInventoryRecords";

@Controller(
  "/shoppingMall/seller/seller-products/:productId/variants/:variantId/inventory-records",
)
export class ShoppingmallSellerSeller_productsVariantsInventory_recordsController {
  /**
   * Create a new inventory history entry for a specific seller-owned product variant.
   *
   * This operation records one atomic stock movement in the immutable inventory ledger for the target variant under the specified seller product. It is used when the seller needs to restock inventory or manually reduce stock for operational reasons. In the underlying database design, `shopping_mall_inventory_records` is the audit-friendly stock movement ledger for a `shopping_mall_product_variants` record, and each row captures a signed `quantity_change`, a business `reason`, and the `occurred_at` timestamp that determines when the movement takes effect in stock history. The platform does not store a mutable stock balance in the variant itself; instead, the current stock quantity is derived by summing signed changes across preserved inventory records.
   *
   * This endpoint is intended only for the seller who owns the parent product. The request is scoped through both `shopping_mall_products` and `shopping_mall_product_variants` because products are seller-owned catalog records and variants are managed only within products owned by that same seller. Before creating the inventory entry, the system must confirm that the specified variant belongs to the specified product and that the authenticated seller owns that product. If the seller attempts to manage a variant attached to another seller's product, the request must be rejected.
   *
   * The business purpose of this operation is to support the required stock increase and stock reduction workflow while preserving a single consistent history for the variant. The created record becomes part of the same variant-level history that also includes order-based reductions, cancellation restorations, refund restorations, manual reductions, and administrative corrections. This aligns with the requirement that inventory history remain reviewable and consistent with the current stock calculation for the same variant.
   *
   * Consumers should use this operation together with the corresponding inventory history browsing operation for the variant when they need to verify the newly added entry in context. After successful creation, subsequent history retrieval should show the new ledger item together with its quantity change, reason, and recorded time. Validation should reject requests that do not identify a valid owned product/variant pair, provide an invalid stock movement payload, or attempt to treat inventory as a directly editable balance rather than a preserved sequence of stock movements.
   *
   * @param connection
   * @param productId Target seller product identifier
   * @param variantId Target product variant identifier within the product
   * @param body Inventory stock movement details to record
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Implement a seller-scoped creation flow for `shopping_mall_inventory_records`.
   *
   * 1. Authenticate the caller as a seller.
   * 2. Load the target `shopping_mall_products` row by `productId` and confirm it exists, is not deleted for seller management purposes, and is owned by the authenticated seller through `shopping_mall_seller_id`.
   * 3. Load the target `shopping_mall_product_variants` row by `variantId` and confirm it exists, is not deleted for seller management purposes, and belongs to the same product through `shopping_mall_product_id = productId`.
   * 4. Validate the request body against `IShoppingMallInventoryRecord.ICreate`. The implementation must map the input to the actual schema fields required for a new ledger row, especially `quantity_change`, `reason`, and `occurred_at`. Generate `id`, `created_at`, and `updated_at` server-side. Persist `deleted_at` as null on creation.
   * 5. Enforce business meaning of quantity changes: positive values represent restocking or stock increases, negative values represent manual stock reductions. Reject zero if the DTO or business validation disallows no-op movements. Require a non-empty business reason explaining the movement.
   * 6. Insert a new `shopping_mall_inventory_records` row linked to `shopping_mall_product_variant_id = variantId`. Do not update a stock column anywhere because current stock must remain derived from the ledger.
   * 7. Return the created inventory record.
   *
   * Additional implementation notes:
   * - Use a transaction if the service also computes and returns any derived stock summary alongside creation, so the inserted ledger entry and derived calculations observe a consistent state.
   * - Do not implement history editing or deletion in this operation. Inventory history is intended to remain preserved for audit and dispute review.
   * - Error cases should include: product not found, variant not found, variant does not belong to the product, seller does not own the product, invalid quantity change semantics, and invalid occurred-at or reason payloads.
   * - For authorization failures, avoid disclosing ownership details beyond what is necessary for secure error handling.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("variantId")
    variantId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallInventoryRecord.ICreate,
  ): Promise<IShoppingMallInventoryRecord> {
    try {
      return await postShoppingMallSellerSellerProductsProductIdVariantsVariantIdInventoryRecords(
        {
          seller,
          productId,
          variantId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated inventory history for a specific seller product variant.
   *
   * This operation lets an authenticated seller review the immutable stock movement ledger for one variant that belongs to one of the seller's own products. The underlying inventory history is stored in `shopping_mall_inventory_records`, where each row represents one atomic stock movement rather than a mutable stock balance. As described by the schema, each record contains a signed `quantity_change`, a business `reason`, and an `occurred_at` timestamp indicating when the movement should count in the ledger. The response therefore represents an audit-oriented history of how the variant's stock position was formed over time.
   *
   * The endpoint is intentionally nested under both `/seller-products/{productId}` and `/variants/{variantId}` because `shopping_mall_product_variants` belongs to `shopping_mall_products`, and seller permissions are scoped through product ownership. Before returning any data, the system must verify that the target product exists, that the target variant belongs to that product through `shopping_mall_product_id`, and that the product is owned by the authenticated seller through `shopping_mall_seller_id`. This enforces the owner-only variant management rule and prevents a seller from browsing inventory history for another seller's catalog.
   *
   * The returned history is variant-level history, not product-level history. This follows the business rule that stock is tracked per purchasable variant, and current stock is derived from the full sequence of immutable inventory records rather than stored directly in the variant row. The list should include all relevant movement categories preserved by the business workflow, including seller restocking, seller manual reduction, order placement reductions, cancellation restorations, refund restorations, and administrative corrections when present in the ledger. Because the inventory ledger is the source of truth for stock derivation, the browsing result must stay consistent with the same record set used for stock calculation.
   *
   * This operation is typically used after the seller has already identified a product and one of its variants through the seller product and variant management APIs. It complements variant maintenance operations by exposing the preserved ledger behind the current stock state. If the seller needs to create a new stock movement, that must be done through the dedicated inventory creation workflow rather than this browsing endpoint. If the product or variant is not found, if the variant does not belong to the specified product, or if the authenticated seller does not own the product, the request must be rejected without exposing cross-seller inventory information.
   *
   * @param connection
   * @param productId Target seller product identifier
   * @param variantId Target product variant identifier scoped to the specified product
   * @param body Pagination, filtering, and sorting options for inventory history browsing
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Implement this operation as a seller-scoped inventory ledger query for a single product variant.
   *
   * 1. Authenticate the caller as a seller.
   * 2. Load the target product from `shopping_mall_products` by `id = productId` and `deleted_at IS NULL` unless the platform intentionally allows viewing deleted owned products in seller tooling. Validate that `shopping_mall_seller_id` matches the authenticated seller account. If not found or not owned, reject the request.
   * 3. Load the target variant from `shopping_mall_product_variants` by `id = variantId`, `shopping_mall_product_id = productId`, and `deleted_at IS NULL` unless deleted variants remain browsable in seller history tooling. If not found, reject the request. This step must ensure the variant belongs to the specified product.
   * 4. Query `shopping_mall_inventory_records` for rows where `shopping_mall_product_variant_id = variantId`. Exclude rows with `deleted_at IS NOT NULL` in normal business browsing because the ledger is intended to remain preserved and active history should be derived from non-deleted rows.
   * 5. Apply request-body search controls from `IShoppingMallInventoryRecord.IRequest`, supporting pagination plus filters that are consistent with loaded schema fields, such as `reason`, `occurred_at` range, and sort order by `occurred_at` or `created_at`. Do not invent unsupported filters.
   * 6. Default sorting should present a stable chronological review order suitable for ledger browsing, preferably newest first by `occurred_at` and then `created_at` as a tiebreaker, unless the request explicitly overrides the sort.
   * 7. Return a paginated `IPageIShoppingMallInventoryRecord` result containing the filtered ledger entries. Each item should expose the inventory record information grounded in the schema, especially the signed quantity change, business reason, timestamps, and relation to the target variant.
   * 8. Error handling: reject when product ownership fails, when the variant does not belong to the product, or when either resource does not exist. Never leak whether another seller owns the target resource beyond a generic not-found/forbidden policy consistent with platform standards.
   * 9. Keep the operation read-only. Do not create, edit, or delete inventory records here. The current stock shown elsewhere must remain derivable from the same preserved inventory rows returned by this operation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("variantId")
    variantId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallInventoryRecord.IRequest,
  ): Promise<IPageIShoppingMallInventoryRecord> {
    try {
      return await patchShoppingMallSellerSellerProductsProductIdVariantsVariantIdInventoryRecords(
        {
          seller,
          productId,
          variantId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single inventory history record for a specific product variant owned through a seller product listing.
   *
   * This operation returns one immutable stock movement entry from the inventory ledger attached to a product variant. In the underlying data model, `shopping_mall_inventory_records` stores atomic inventory changes such as restocking, manual adjustment, order placement, cancellation restoration, refund restoration, or administrative correction. Each record contains the signed `quantity_change`, the business `reason`, and the business event time `occurred_at`, while the current stock is derived from the sum of ledger entries rather than from a mutable balance stored on the variant itself. Because inventory history is defined at the product variant level, this endpoint is scoped through both the parent product and the variant to make the record’s ownership and catalog context explicit.
   *
   * Access to this operation must respect seller ownership boundaries. The requirements state that sellers may manage and review variants only for products they own, and inventory history browsing must show a seller the full sequence of inventory records for each of their own product variants. Therefore, the caller must be authorized as the seller who owns the parent `shopping_mall_products` record, or as an administrative actor performing marketplace oversight. A seller must never be allowed to read an inventory record for another seller's product, even when the caller knows the UUID values.
   *
   * This operation is closely related to inventory history list browsing for a variant. A seller would typically use the variant-level inventory history list operation first to review all preserved inventory records that contribute to current stock, and then use this detail endpoint when a specific entry requires closer inspection. The returned record should remain consistent with the variant’s history model, where restocking, order-driven reductions, cancellation restorations, refund restorations, and manual reductions coexist in the same audit-friendly ledger.
   *
   * The implementation must verify the full hierarchy before returning data. The `productId` must identify an existing product, the `variantId` must identify a variant belonging to that product, and the `inventoryRecordId` must identify an inventory record belonging to that variant. If any link in this chain is invalid, or if the product, variant, or inventory record is not available for normal retrieval under the service’s active-record policy, the request must fail rather than returning unrelated data. This prevents cross-product or cross-variant leakage and keeps inventory review consistent with the seller-owned catalog structure.
   *
   * @param connection
   * @param productId Target seller product identifier
   * @param variantId Target product variant identifier within the product
   * @param inventoryRecordId Target inventory history record identifier within the variant
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Load the target inventory record by traversing the declared hierarchy instead of querying the inventory record in isolation.
   *
   * 1. Authorize the caller as a seller or administrator-level actor. For seller access, resolve the authenticated seller account and require that `shopping_mall_products.shopping_mall_seller_id` matches that actor. For administrator access, allow oversight access under platform governance rules.
   * 2. Query `shopping_mall_products` by `id = productId` and normal active-record visibility rules. Reject when not found or not accessible.
   * 3. Query `shopping_mall_product_variants` by `id = variantId` and `shopping_mall_product_id = productId`. Exclude variants outside the specified product. Under normal retrieval rules, reject variants that are logically deleted unless the service explicitly supports an internal historical-read mode.
   * 4. Query `shopping_mall_inventory_records` by `id = inventoryRecordId` and `shopping_mall_product_variant_id = variantId`. Reject if the record does not belong to the variant named in the route. Under normal seller-facing retrieval, exclude records with `deleted_at` set, because inventory history is intended to remain preserved and active records should normally be readable without surfacing logically removed anomalies.
   * 5. Map the row to `IShoppingMallInventoryRecord`, returning the inventory record’s identifier, variant linkage, signed `quantity_change`, `reason`, business timestamp `occurred_at`, and audit timestamps as defined by the DTO schema.
   *
   * Implementation should use simple read-only queries and does not require a transaction unless the surrounding service framework standardizes transaction wrappers for all requests. The service must not recalculate stock in this endpoint, but it should preserve semantic consistency with the inventory-history model in which current stock is derived from the full ledger. If the product exists but belongs to another seller, return an authorization failure rather than leaking existence details beyond the platform’s chosen security policy. If the product exists, the variant exists, but the inventory record is outside that variant, return not found for the nested resource.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":inventoryRecordId")
  public async at(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("variantId")
    variantId: string & tags.Format<"uuid">,
    @TypedParam("inventoryRecordId")
    inventoryRecordId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallInventoryRecord> {
    try {
      return await getShoppingMallSellerSellerProductsProductIdVariantsVariantIdInventoryRecordsInventoryRecordId(
        {
          seller,
          productId,
          variantId,
          inventoryRecordId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
