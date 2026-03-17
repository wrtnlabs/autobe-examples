import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallProductSnapshot } from "../../../../../structures/IPageIShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshot } from "../../../../../structures/IShoppingMallProductSnapshot";

export * as variant_snapshots from "./variant_snapshots/index";
export * as image_copies from "./image_copies/index";

/**
 * Retrieve a filtered and paginated list of preserved snapshots for a specific product.
 *
 * This operation exposes the immutable history recorded in `shopping_mall_product_snapshots` for one `shopping_mall_products` record. Each snapshot row is a historical snapshot event for a product, identified by `shopping_mall_product_id` and anchored by `created_at`, and it serves as the parent record for preserved historical children such as `shopping_mall_product_snapshot_image_copies` and related `shopping_mall_product_variant_snapshots`. The endpoint supports the business requirement that sellers can review earlier versions of their own products and administrators can review historical product states for oversight, investigation, and dispute resolution.
 *
 * The returned records represent preserved history rather than editable working data. The requirements state that product snapshots are not deletable as a business operation and must remain available even after the related current product is no longer listed. The historical review purpose is especially important because the platform must create a product snapshot immediately before an accepted product edit is applied. As a result, this endpoint should be understood as a history-browsing interface over append-only evidence records, not as a live product management endpoint.
 *
 * When a caller reviews a product's snapshot history, the platform should help them understand how the product was presented at each historical point. A specific snapshot may later be opened through a detail endpoint to inspect the preserved product composition, including copied gallery images from `shopping_mall_product_snapshot_image_copies` and linked variant history from `shopping_mall_product_variant_snapshots`. This list endpoint is therefore the normal entry point for historical investigation workflows, allowing the caller to find the relevant snapshot version before requesting a deeper single-snapshot view.
 *
 * Access to this operation is restricted by business role and ownership. A seller may use it only for products owned by that seller, because `shopping_mall_products` is a seller-owned listing identified by `shopping_mall_seller_id`. An administrator may use it for any product on the platform in order to perform oversight and dispute review. If the product does not exist or the caller lacks authority over the referenced product, the operation must fail without exposing unauthorized historical data. The operation should also behave correctly when the current product has been removed from active listings, because preserved snapshots remain reviewable after current listing removal.
 *
 * @param props.connection
 * @param props.productId Target product's unique identifier
 * @param props.body Snapshot history filters and pagination options
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor administrator
 * @x-autobe-specification 1. Authenticate the caller and determine whether the actor is a seller or administrator.
 * 2. Resolve the target `shopping_mall_products` row by `id = :productId`.
 * 3. If no product exists, return a not-found error.
 * 4. If the caller is a seller, verify that `shopping_mall_products.shopping_mall_seller_id` belongs to the authenticated seller account. If not, reject with a forbidden error.
 * 5. If the caller is an administrator, allow access for oversight purposes.
 * 6. Read pagination, sorting, and optional filter criteria from `IShoppingMallProductSnapshot.IRequest`. Supported filters should be limited to fields actually available from the loaded schema, especially snapshot creation time and identifiers. Free-text change filtering is not available directly on `shopping_mall_product_snapshots` because `change_summary` exists on `shopping_mall_product_variant_snapshots`, not on the product snapshot table itself.
 * 7. Query `shopping_mall_product_snapshots` constrained by `shopping_mall_product_id = :productId`, ordered by `created_at` descending by default so the newest preserved version appears first. Apply pagination constraints from the request body.
 * 8. For summary enrichment, include lightweight aggregate information derived from child records when needed, such as image copy count from `shopping_mall_product_snapshot_image_copies` and variant snapshot count from `shopping_mall_product_variant_snapshots`, but avoid loading full child payloads for every row in the paginated list unless the summary DTO explicitly requires them.
 * 9. Return an `IPageIShoppingMallProductSnapshot.ISummary` response containing pagination metadata and snapshot summary rows.
 * 10. Do not allow mutation of snapshot records anywhere in this flow. Snapshot records are immutable business-audit artifacts. This endpoint only reads preserved history.
 * 11. Ensure the implementation continues to return existing historical snapshots even if `shopping_mall_products.deleted_at` is populated, because snapshot preservation remains required after listing removal.
 * 12. Use indexed access patterns on `shopping_mall_product_snapshots` by `(shopping_mall_product_id, created_at)` for efficient history browsing.
 * @path /shoppingMall/administrator/products/:productId/snapshots
 * @accessor api.functional.shoppingMall.administrator.products.snapshots.index
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
     * Target product's unique identifier
     */
    productId: string & tags.Format<"uuid">;

    /**
     * Snapshot history filters and pagination options
     */
    body: IShoppingMallProductSnapshot.IRequest;
  };
  export type Body = IShoppingMallProductSnapshot.IRequest;
  export type Response = IPageIShoppingMallProductSnapshot.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/administrator/products/:productId/snapshots",
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
    `/shoppingMall/administrator/products/${encodeURIComponent(props.productId ?? "null")}/snapshots`;
  export const random = (): IPageIShoppingMallProductSnapshot.ISummary =>
    typia.random<IPageIShoppingMallProductSnapshot.ISummary>();
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
 * Retrieve one preserved historical snapshot for a product.
 *
 * This operation returns a single immutable product snapshot that belongs to the specified product and is used to review how that product was represented at a specific historical point. The underlying snapshot record is anchored by `shopping_mall_product_snapshots`, which marks the creation time of the historical snapshot event for a source `shopping_mall_products` record. In accordance with the snapshot requirements, the response is expected to expose not only the selected snapshot event itself but also the preserved image state and the related variant snapshot state captured for the same historical moment so the product can be reconstructed as a complete historical view.
 *
 * The product snapshot is part of the platform's preserved history model. The requirements state that product snapshots must remain available after creation, must not be deletable as a business operation, and must continue to be available even when the related current product no longer appears in listings. This operation therefore serves historical review rather than live catalog browsing. It should present the snapshot's copied gallery images from `shopping_mall_product_snapshot_image_copies`, including the `sequence`, `image_uri`, and `thumbnail` information that preserves historical gallery order and main-thumbnail meaning. It should also present the related variant snapshot records from `shopping_mall_product_variant_snapshots` and their normalized option entries from `shopping_mall_product_variant_snapshot_option_values` so viewers can understand the preserved SKU structure, option combinations, and variant-level historical state associated with the selected snapshot.
 *
 * Security and access control are central to this endpoint. Sellers are allowed to review snapshots only for products they own, including preserved snapshots of products that were later removed from active listings. Administrators are allowed to review snapshots for any product across the platform for oversight, investigation, and dispute resolution. The operation must therefore verify both that the target snapshot belongs to the target product and that the caller is authorized to access that product's history. Returning a snapshot only by `productSnapshotId` without validating the parent `productId` would be insufficient because the path structure establishes product-scoped access semantics.
 *
 * This operation is commonly used after a snapshot-history listing operation has been executed to identify the target historical record to open in detail. Once a caller selects a historical entry, this endpoint provides the preserved state for detailed examination, including prior image arrangements and related variant history. If the specified product does not exist, the snapshot does not exist, or the snapshot does not belong to the specified product, the system must reject the request. If a seller requests a snapshot for a product owned by another seller, the system must deny access even when the snapshot itself exists.
 *
 * @param props.connection
 * @param props.productId Target product's ID that scopes snapshot access
 * @param props.productSnapshotId Target preserved product snapshot's ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor administrator
 * @x-autobe-specification Implement this operation as a detail lookup for one immutable product snapshot scoped by product.
 *
 * 1. Authenticate the caller and allow access for seller and administrator actors.
 * 2. Resolve the target product by `shopping_mall_products.id = :productId`. Do not exclude rows only because `deleted_at` is set, because preserved snapshots of deleted products must remain reviewable by authorized parties.
 * 3. Resolve the target snapshot by `shopping_mall_product_snapshots.id = :productSnapshotId` and `shopping_mall_product_snapshots.shopping_mall_product_id = :productId`. If no such row exists, return a not-found error.
 * 4. If the caller is a seller, enforce ownership by verifying `shopping_mall_products.shopping_mall_seller_id` matches the authenticated seller account. If it does not match, return a forbidden error. If the caller is an administrator, allow access without seller-ownership restriction.
 * 5. Load child image copies from `shopping_mall_product_snapshot_image_copies` filtered by `shopping_mall_product_snapshot_id = :productSnapshotId`, ordered by `sequence ASC`, so the historical gallery is reconstructed in preserved display order. Map `image_uri`, `sequence`, and `thumbnail` exactly as stored.
 * 6. Load related variant snapshots from `shopping_mall_product_variant_snapshots` filtered by `shopping_mall_product_snapshot_id = :productSnapshotId`, ordered by `created_at ASC` or a stable deterministic key such as `id ASC` if the DTO requires deterministic ordering. For each variant snapshot, load its option values from `shopping_mall_product_variant_snapshot_option_values` filtered by `shopping_mall_product_variant_snapshot_id`, excluding rows where `deleted_at` is not null if the implementation treats deleted option-value support rows as hidden from historical presentation. Preserve the normalized option entries in the response.
 * 7. Materialize a single `IShoppingMallProductSnapshot` response that includes the snapshot anchor information plus the preserved image copies and variant snapshot details needed for historical review and complete reconstruction of the product's sellable structure at that time.
 *
 * Business rules to enforce: snapshots are read-only preserved artifacts; this endpoint must not mutate snapshot rows or create replacement history. The implementation must validate parent-child consistency between product and snapshot, because the URL is product-scoped. The implementation should avoid joining against mutable live product image rows for historical presentation; only snapshot-owned image copies and snapshot-linked variant data should drive the historical state shown by this endpoint. Handle missing product, missing snapshot, mismatched parent scope, and unauthorized seller access explicitly with clear error mapping.
 * @path /shoppingMall/administrator/products/:productId/snapshots/:productSnapshotId
 * @accessor api.functional.shoppingMall.administrator.products.snapshots.at
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
     * Target product's ID that scopes snapshot access
     */
    productId: string & tags.Format<"uuid">;

    /**
     * Target preserved product snapshot's ID
     */
    productSnapshotId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallProductSnapshot;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/administrator/products/:productId/snapshots/:productSnapshotId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/administrator/products/${encodeURIComponent(props.productId ?? "null")}/snapshots/${encodeURIComponent(props.productSnapshotId ?? "null")}`;
  export const random = (): IShoppingMallProductSnapshot =>
    typia.random<IShoppingMallProductSnapshot>();
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
      assert.param("productSnapshotId")(() =>
        typia.assert(props.productSnapshotId),
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
