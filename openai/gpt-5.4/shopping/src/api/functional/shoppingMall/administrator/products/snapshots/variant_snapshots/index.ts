import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallProductVariantSnapshot } from "../../../../../../structures/IPageIShoppingMallProductVariantSnapshot";
import { IShoppingMallProductVariantSnapshot } from "../../../../../../structures/IShoppingMallProductVariantSnapshot";

/**
 * Retrieve a filtered and paginated list of variant snapshot records that were preserved as part of a specific product snapshot.
 *
 * This operation provides historical review of immutable variant state captured under a selected product snapshot for a seller-owned product. In the underlying data model, `shopping_mall_product_snapshots` is the immutable snapshot event record for a product, and `shopping_mall_product_variant_snapshots` contains append-only point-in-time history records for product variants. Each returned record represents a preserved historical variant state tied to the selected `shopping_mall_product_snapshot_id`, allowing the caller to inspect how the full sellable structure looked at that moment rather than only the product-level snapshot anchor.
 *
 * The operation is intended for authorized sellers and administrators only. A seller may use it only for products owned by that seller, matching the requirement that sellers can review snapshots of their own products and variant history for their own products only. An administrator may use it for any product on the platform for oversight, dispute review, and historical investigation. The service must therefore validate both the product-to-snapshot relationship and the caller's authority before returning data. If the specified snapshot does not belong to the specified product, the request must be rejected.
 *
 * The response should help the caller understand the preserved historical variant information described by the database schema and requirements, including the immutable audit metadata on the variant snapshot record, the historical link to the source variant, and the fact that these records participate in complete product reconstruction. In particular, the historical review use case must support understanding the preserved SKU-oriented variant identity, option configuration context, variant price context, change summary, and creation time associated with each snapshot record. This operation is therefore commonly used together with `GET /products/{productId}/snapshots/{productSnapshotId}` or an equivalent product snapshot detail operation so the caller can first load the parent product snapshot and then inspect the included variant snapshot collection.
 *
 * Because these records are immutable historical artifacts used for review, dispute handling, and reconstruction of variant change history, this operation does not modify any snapshot data. It only searches and returns rows already preserved in `shopping_mall_product_variant_snapshots` for the selected `shopping_mall_product_snapshot_id`. Sorting by creation time is especially important when comparing historical states, and filtering by snapshot-owned fields such as `change_summary` may be supported to make audit review practical.
 *
 * Expected failures include requesting a product that does not exist, requesting a product snapshot that does not exist, requesting a snapshot that belongs to a different product, or attempting seller access to another seller's product history. In all of those cases, the service must deny the request rather than leaking preserved historical records across ownership boundaries.
 *
 * @param props.connection
 * @param props.productId Target product's ID
 * @param props.productSnapshotId Target product snapshot's ID under the specified product
 * @param props.body Filtering, sorting, and pagination criteria for product variant snapshots
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor administrator
 * @x-autobe-specification Validate that `productId` identifies an existing
 *   `shopping_mall_products` row.
 *
 * Validate that `productSnapshotId` identifies an existing `shopping_mall_product_snapshots` row whose `shopping_mall_product_id` matches the requested product. Reject the request when the snapshot does not exist or belongs to a different product.
 *
 * Authorize access according to actor role. If the caller is a seller, confirm that the target product's `shopping_mall_seller_id` belongs to the authenticated seller account before continuing. If the caller is an administrator or superAdministrator, allow access for oversight. Deny access for customers and unauthenticated callers.
 *
 * Parse `IShoppingMallProductVariantSnapshot.IRequest` as list criteria. Support pagination inputs, sort directives, and optional filters limited to fields that are actually present or safely derivable from loaded schemas, especially `change_summary`, `created_at`, and source variant linkage through `shopping_mall_product_variant_id`. If implementation exposes SKU code, option summary, or price in the response DTO, fetch them by joining `shopping_mall_product_variants` on `shopping_mall_product_variant_id`, because those attributes are stored on the live variant table rather than duplicated on the snapshot row itself.
 *
 * Query `shopping_mall_product_variant_snapshots` with a mandatory predicate `shopping_mall_product_snapshot_id = :productSnapshotId`. Join `shopping_mall_product_variants` to ensure each snapshot belongs to a variant whose `shopping_mall_product_id = :productId`, even though the parent snapshot relationship has already been validated, so the result set remains defensively constrained. Apply requested filters, then apply deterministic sorting with `created_at` and `id` as stable tie-breakers.
 *
 * Return a paginated response of variant snapshot records for the selected historical product snapshot. Include only preserved historical data and related read-only context needed for review. Do not create, update, or remove any snapshot rows. Handle empty results as a successful response with an empty page when the product snapshot exists but contains no matching rows after filters.
 *
 * Implementation should avoid leaking other sellers' historical records by performing authorization and ownership checks before executing the final query or by embedding ownership predicates directly into the query path for seller callers.
 * @path /shoppingMall/administrator/products/:productId/snapshots/:productSnapshotId/variant-snapshots
 * @accessor api.functional.shoppingMall.administrator.products.snapshots.variant_snapshots.index
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
     * Target product's ID
     */
    productId: string & tags.Format<"uuid">;

    /**
     * Target product snapshot's ID under the specified product
     */
    productSnapshotId: string & tags.Format<"uuid">;

    /**
     * Filtering, sorting, and pagination criteria for product variant snapshots
     */
    body: IShoppingMallProductVariantSnapshot.IRequest;
  };
  export type Body = IShoppingMallProductVariantSnapshot.IRequest;
  export type Response = IPageIShoppingMallProductVariantSnapshot;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/administrator/products/:productId/snapshots/:productSnapshotId/variant-snapshots",
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
    `/shoppingMall/administrator/products/${encodeURIComponent(props.productId ?? "null")}/snapshots/${encodeURIComponent(props.productSnapshotId ?? "null")}/variant-snapshots`;
  export const random = (): IPageIShoppingMallProductVariantSnapshot =>
    typia.random<IPageIShoppingMallProductVariantSnapshot>();
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
      assert.param("productSnapshotId")(() =>
        typia.assert(props.productSnapshotId),
      );
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
 * Retrieve a single immutable product variant snapshot that belongs to a specific historical product snapshot and product.
 *
 * This operation exists to support historical review of merchandise configuration at a precise past moment. The underlying variant snapshot record in `shopping_mall_product_variant_snapshots` is an append-only history artifact that stores snapshot-owned audit metadata, including the `change_summary` and `created_at` timestamp, while its preserved option combination is normalized through `shopping_mall_product_variant_snapshot_option_values`. In business terms, this endpoint allows an authorized reviewer to inspect the preserved SKU-level variant state that formed part of a broader product snapshot reconstruction.
 *
 * The endpoint is intentionally nested under `/products/{productId}/snapshots/{productSnapshotId}` because the historical review requirements state that variant snapshots may be inspected as part of a complete product snapshot view. The parent `shopping_mall_product_snapshots` record is the temporal anchor for the full historical product state, and the child variant snapshot must belong to that snapshot and to the same source product. This means the operation is not only fetching a variant snapshot by identifier, but also validating the historical containment relationship between the product, the product snapshot, and the variant snapshot.
 *
 * Access is restricted to authorized oversight actors. Sellers may review variant snapshot history only for variants of their own products, including history for products later removed from active listings. Administrators may review variant snapshot history for any product on the platform for oversight, audit, and dispute resolution purposes. The operation must therefore verify ownership when the requester is a seller and must deny access when a seller attempts to inspect another seller's preserved history.
 *
 * The response should expose the preserved historical details needed for review, including the variant snapshot identity, the source live variant reference, the parent product snapshot relationship, the human-readable change summary, the snapshot creation time, and the preserved option values recorded in `shopping_mall_product_variant_snapshot_option_values`. These option rows represent atomic name-value entries such as color and size so reviewers can understand what option combination existed at the historical point in time.
 *
 * This operation is commonly used together with the corresponding product snapshot detail retrieval operation. A caller typically opens a historical product snapshot first to inspect the preserved product-level state and then opens an individual variant snapshot within that historical view to inspect variant-specific preserved details. If the specified identifiers do not form a valid containment chain, or if the requester is not authorized for the target product history, the operation must reject the request.
 *
 * @param props.connection
 * @param props.productId Target product's ID
 * @param props.productSnapshotId Target product snapshot's ID
 * @param props.productVariantSnapshotId Target product variant snapshot's ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor administrator
 * @x-autobe-specification Implement a read-only detail query for one historical
 *   variant snapshot scoped by product and product snapshot context.
 *
 * 1. Resolve the target `shopping_mall_product_snapshots` row by `productSnapshotId` and ensure its `shopping_mall_product_id` matches `productId`. If no such row exists, return a not-found error for the scoped historical product snapshot.
 *
 * 2. Resolve the target `shopping_mall_product_variant_snapshots` row by `productVariantSnapshotId` and ensure its `shopping_mall_product_snapshot_id` equals `productSnapshotId`. Because this endpoint is scoped to a historical product snapshot reconstruction, do not allow access to variant snapshot rows that are unrelated to the specified product snapshot or whose optional `shopping_mall_product_snapshot_id` is null.
 *
 * 3. Join from `shopping_mall_product_variant_snapshots.shopping_mall_product_variant_id` to `shopping_mall_product_variants.id` and verify that the live variant's `shopping_mall_product_id` matches `productId`. This guards against mismatched identifiers even if an ID exists independently.
 *
 * 4. Authorize the requester. If the requester is a seller, join through `shopping_mall_products` and verify the target product's `shopping_mall_seller_id` matches the authenticated seller account. If the requester is an administrator or super administrator, allow access. Reject all other actors.
 *
 * 5. Load child option rows from `shopping_mall_product_variant_snapshot_option_values` where `shopping_mall_product_variant_snapshot_id` equals the target snapshot ID. Exclude rows whose `deleted_at` is not null if the application policy treats them as inactive, even though snapshot option entries are normally preserved.
 *
 * 6. Materialize the response DTO as `IShoppingMallProductVariantSnapshot`, including the snapshot's own fields and the preserved option values collection. Preserve ordering deterministically for option rows, such as by `name` ascending, unless a stronger DTO contract exists elsewhere.
 *
 * 7. Do not mutate any snapshot, variant, product, or option-value data. This operation is strictly historical viewing. Use straightforward read queries without transactional writes.
 *
 * 8. Error handling: return not found when any scoped resource relationship is invalid; return forbidden when a seller lacks ownership; return unauthorized when no authenticated seller or administrator context exists. Deleted live products or variants must not block access if the preserved snapshot chain is valid, because history review remains available for authorized parties.
 * @path /shoppingMall/administrator/products/:productId/snapshots/:productSnapshotId/variant-snapshots/:productVariantSnapshotId
 * @accessor api.functional.shoppingMall.administrator.products.snapshots.variant_snapshots.at
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
     * Target product snapshot's ID
     */
    productSnapshotId: string & tags.Format<"uuid">;

    /**
     * Target product variant snapshot's ID
     */
    productVariantSnapshotId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallProductVariantSnapshot;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/administrator/products/:productId/snapshots/:productSnapshotId/variant-snapshots/:productVariantSnapshotId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/administrator/products/${encodeURIComponent(props.productId ?? "null")}/snapshots/${encodeURIComponent(props.productSnapshotId ?? "null")}/variant-snapshots/${encodeURIComponent(props.productVariantSnapshotId ?? "null")}`;
  export const random = (): IShoppingMallProductVariantSnapshot =>
    typia.random<IShoppingMallProductVariantSnapshot>();
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
      assert.param("productVariantSnapshotId")(() =>
        typia.assert(props.productVariantSnapshotId),
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
