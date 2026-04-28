import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallProductVariantSnapshot } from "../../../../../../api/structures/IPageIShoppingMallProductVariantSnapshot";
import { IShoppingMallProductVariantSnapshot } from "../../../../../../api/structures/IShoppingMallProductVariantSnapshot";
import { AdministratorAuth } from "../../../../../../decorators/AdministratorAuth";
import { AdministratorPayload } from "../../../../../../decorators/payload/AdministratorPayload";
import { getShoppingMallAdministratorProductsProductIdVariantsVariantIdSnapshotsProductVariantSnapshotId } from "../../../../../../providers/getShoppingMallAdministratorProductsProductIdVariantsVariantIdSnapshotsProductVariantSnapshotId";
import { patchShoppingMallAdministratorProductsProductIdVariantsVariantIdSnapshots } from "../../../../../../providers/patchShoppingMallAdministratorProductsProductIdVariantsVariantIdSnapshots";

@Controller(
  "/shoppingMall/administrator/products/:productId/variants/:variantId/snapshots",
)
export class ShoppingmallAdministratorProductsVariantsSnapshotsController {
  /**
   * Retrieve a filtered and paginated history of snapshot records for a specific product variant within its parent product.
   *
   * This operation exposes immutable historical records from the product-variant snapshot domain so authorized parties can review how a variant changed over time. The underlying snapshot resource represents an immutable point-in-time history record for a product variant, and the loaded requirements specify that historical review must show the preserved SKU code, option values, and variant price recorded at each snapshot event. Because product snapshots reconstruct the complete product offering together with included variant snapshots, this endpoint is a history-browsing companion for product history review and supports investigation of prior merchandise states, disputes, and oversight activities.
   *
   * Access to this operation is limited to actors who are permitted to review variant history. Sellers may review snapshot records only for variants belonging to their own products, reflecting the owner-only variant management rule and the requirement that one seller must never be shown another seller's snapshot history. Administrators may review variant snapshot history for any product on the platform, including products that are currently active and products that were later removed from listings, because the preserved records remain available for oversight and dispute resolution.
   *
   * The path is intentionally nested under both the product and the variant. This mirrors the business relationship in which a purchasable SKU-level variant belongs to a seller-owned product, while a product-variant snapshot is an immutable historical record tied to that variant. The parent product parameter is not redundant: it allows the service to confirm that the variant is actually part of the specified product before returning data, and it provides the ownership scope needed to enforce seller-only access rules. The historical records returned by this operation should be understood as review material only; they are not editable and are not removed through this API.
   *
   * Clients will typically use this operation when presenting variant change history screens, dispute investigation views, or administrative oversight pages. When broader historical context is needed, this operation should be used together with product snapshot history APIs so a caller can compare an individual variant's preserved states with the larger product snapshot that reconstructs the complete sellable configuration at the same historical point. Error handling should reject requests when the product does not exist, the variant does not belong to the product, the caller is not authorized to review the requested history, or the paging and sorting inputs are invalid.
   *
   * @param connection
   * @param productId Target product's ID
   * @param variantId Target variant's ID
   * @param body Paging, sorting, and filtering options for variant snapshot history
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor administrator
     * @x-autobe-specification Implement this operation as a paginated history
     *   query over the product variant snapshot records scoped by a specific
     *   product and variant.
   *
   * 1. Authenticate the caller and require either seller or administrator authority.
   * 2. Resolve the product by productId from the current product domain and fail if it does not exist.
   * 3. Resolve the variant by variantId and fail if it does not exist.
   * 4. Validate that the resolved variant belongs to the resolved product; reject the request when the variant-product relationship does not match the path scope.
   * 5. If the caller is a seller, verify that the parent product is owned by that seller. Reject access when the product belongs to another seller.
   * 6. If the caller is an administrator, allow platform-wide review without seller ownership restriction.
   * 7. Query shopping_mall_product_variant_snapshots for records belonging to the target variant. Apply request-body filters if defined by IShoppingMallProductVariantSnapshot.IRequest, such as pagination, ordering by snapshot creation time, and optional date or event-based narrowing if the DTO supports them.
   * 8. Return results in descending historical order by default so the newest preserved state appears first unless an explicit supported sort is requested.
   * 9. Map each row to summary output suitable for history browsing. Include the snapshot identifier and the preserved historical fields that the snapshot summary type exposes, especially the preserved SKU code, option values, and variant price state.
   * 10. Return a paginated response in IPageIShoppingMallProductVariantSnapshot.ISummary format.
   *
   * Use a read-only transaction or consistent read strategy if needed so pagination metadata and returned rows remain aligned. Do not attempt to modify snapshot data because variant snapshot records are immutable historical records created automatically by the system when variant changes occur. Handle edge cases explicitly: nonexistent product, nonexistent variant, variant outside the given product scope, seller requesting another seller's history, and malformed pagination or sorting inputs. If the variant has been removed from the current listing but preserved snapshot records still exist, authorized historical review should continue to work against the preserved snapshot data.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdministratorAuth()
    administrator: AdministratorPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("variantId")
    variantId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallProductVariantSnapshot.IRequest,
  ): Promise<IPageIShoppingMallProductVariantSnapshot.ISummary> {
    try {
      return await patchShoppingMallAdministratorProductsProductIdVariantsVariantIdSnapshots(
        {
          administrator,
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
   * Retrieve a single preserved product variant snapshot for historical review.
   *
   * This operation returns one immutable snapshot record from the product variant history associated with the specified product and live variant. In the domain model, a product variant snapshot is a preserved historical version that is separate from the live variant definition. The live variant in `shopping_mall_product_variants` represents the seller-managed current sellable SKU state, while the snapshot in `shopping_mall_product_variant_snapshots` represents a point-in-time historical record used for review, audit, comparison, and dispute handling. The response should expose the preserved snapshot together with its normalized option entries so the caller can understand the exact historical SKU code context, option values, and variant pricing context that existed at that recorded time.
   *
   * Security and visibility are constrained by business ownership and governance rules. The owning seller may review snapshot history only for variants belonging to that seller's own products, and the system must not reveal one seller's variant history to another seller. Administrators are allowed to review variant snapshot history for platform oversight and dispute resolution, and super administrators inherit that authority through their platform-wide administrative boundary. Regular customers do not have authority to access this historical variant-management record. The hierarchical path is important because it binds the snapshot to the parent product and variant and supports explicit authorization and integrity checks.
   *
   * This operation is grounded in the preserved history model across `shopping_mall_products`, `shopping_mall_product_variants`, `shopping_mall_product_variant_snapshots`, and `shopping_mall_product_variant_snapshot_option_values`. The product is the current seller-owned catalog listing, the variant is the current mutable SKU-level definition, and the snapshot is an append-only history record with snapshot-owned audit metadata such as `change_summary` and `created_at`. Snapshot option entries are stored in a dedicated child table so historical option pairs such as color and size remain queryable in normalized form instead of being embedded in JSON or composite text. When the snapshot is associated with a broader product snapshot, it also participates in reconstruction of the complete historical product offering.
   *
   * This endpoint is typically used after the caller has already identified the relevant product and variant from variant management or variant history browsing flows. For example, a seller may first review their product variants and then open a specific preserved snapshot to inspect a past configuration. An administrator may similarly open a specific snapshot during oversight or dispute review. Even if the live variant has later changed or the product has been removed from active listings, authorized history review remains available through preserved snapshot records, so this operation must continue to resolve historical data accurately as long as the snapshot exists and the caller is authorized.
   *
   * The operation must fail when the product, variant, or snapshot does not exist, when the variant does not belong to the specified product, or when the snapshot does not belong to the specified variant. It must also fail when a seller requests a snapshot for another seller's product. These checks protect historical integrity and ensure the API does not expose unrelated or cross-owned records through guessed identifiers.
   *
   * @param connection
   * @param productId Target product's ID that scopes the live variant and ownership check
   * @param variantId Target live product variant's ID under the specified product
   * @param productVariantSnapshotId Target historical product variant snapshot's ID under the specified variant
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor administrator
     * @x-autobe-specification Implement a read-only service that retrieves
     *   exactly one historical variant snapshot under a verified
     *   product-variant hierarchy.
   *
   * 1. Load the target `shopping_mall_product_variants` row by `variantId` and confirm its `shopping_mall_product_id` equals `productId`. If no such row exists, or if the variant belongs to a different product, reject the request as not found.
   * 2. Load the target `shopping_mall_product_variant_snapshots` row by `productVariantSnapshotId` and confirm its `shopping_mall_product_variant_id` equals `variantId`. If not, reject as not found.
   * 3. Load the parent `shopping_mall_products` row referenced by the variant to support authorization and response composition. The product should be used to verify seller ownership even if the product is no longer active in listings.
   * 4. Authorize access as follows:
   *    - seller: allowed only when the authenticated seller owns the parent product via `shopping_mall_products.shopping_mall_seller_id`
   *    - administrator: allowed
   *    - superAdministrator: allowed because this role extends administrator oversight authority
   *    - customer or unrelated anonymous caller: forbidden
   * 5. Load child option rows from `shopping_mall_product_variant_snapshot_option_values` where `shopping_mall_product_variant_snapshot_id = productVariantSnapshotId`, excluding logically removed rows if the project-wide data access layer filters `deleted_at`. Sort deterministically, preferably by `name` ascending, for stable response output.
   * 6. Compose the response DTO `IShoppingMallProductVariantSnapshot` from the snapshot record and its option values. Include snapshot-owned fields such as the snapshot identifier, relationship identifiers as defined by DTO conventions, `changeSummary` mapped from `change_summary`, and `createdAt` mapped from `created_at`. Include the normalized option values collection from the child table. Do not invent fields not backed by the schema.
   * 7. Do not mutate any data. This endpoint is purely for historical review.
   *
   * Implementation notes:
   * - The snapshot table is append-only historical storage; no update or deletion logic belongs here.
   * - The variant table is the mutable current-state source, but this operation must present the historical snapshot as the authoritative preserved view for the requested point in time.
   * - If the snapshot is part of a full product snapshot through `shopping_mall_product_snapshot_id`, that linkage may be included in the DTO only if the DTO schema already defines it; otherwise keep the response limited to verified schema-backed properties.
   * - Return a standard single-resource success response on success, a not-found error for hierarchy mismatches or missing records, and a forbidden error for unauthorized ownership violations.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":productVariantSnapshotId")
  public async at(
    @AdministratorAuth()
    administrator: AdministratorPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("variantId")
    variantId: string & tags.Format<"uuid">,
    @TypedParam("productVariantSnapshotId")
    productVariantSnapshotId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallProductVariantSnapshot> {
    try {
      return await getShoppingMallAdministratorProductsProductIdVariantsVariantIdSnapshotsProductVariantSnapshotId(
        {
          administrator,
          productId,
          variantId,
          productVariantSnapshotId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
