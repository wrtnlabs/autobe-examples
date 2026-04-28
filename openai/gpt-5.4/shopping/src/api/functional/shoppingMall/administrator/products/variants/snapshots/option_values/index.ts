import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallProductVariantSnapshotOptionValue } from "../../../../../../../structures/IPageIShoppingMallProductVariantSnapshotOptionValue";
import { IShoppingMallProductVariantSnapshotOptionValue } from "../../../../../../../structures/IShoppingMallProductVariantSnapshotOptionValue";

/**
 * Retrieve a filtered and paginated list of historical option-value entries preserved for a specific product variant snapshot.
 *
 * This operation exposes the normalized option records stored for a single `shopping_mall_product_variant_snapshots` record. Each returned entry represents an atomic option key and value, such as color or size, that was captured at the time the snapshot was created. The underlying `shopping_mall_product_variant_snapshot_option_values` table exists specifically to keep snapshot-time variant option combinations queryable without relying on arrays, JSON payloads, or composite strings, which makes the preserved historical state suitable for audit, comparison, and dispute review.
 *
 * Access to this operation is restricted to relevant parties defined by the business requirements for variant snapshot history review. A seller may review option-value history only when the targeted snapshot belongs to a variant under a product owned by that seller. An administrator may review the same historical records for any product on the platform for oversight and dispute resolution. The operation must not disclose one seller's variant snapshot history to another seller. This ownership check is essential because variant management and variant history access are both limited to the owner seller for seller-facing use.
 *
 * The resource hierarchy in the path reflects the actual historical relationship across `shopping_mall_products`, `shopping_mall_product_variants`, and `shopping_mall_product_variant_snapshots`. The service should confirm that the specified variant belongs to the specified product and that the specified snapshot belongs to that variant before reading child option entries. This prevents mismatched identifiers from exposing unrelated historical data and ensures the caller is reviewing the exact preserved state associated with that variant at that historical point.
 *
 * This operation is commonly used together with the parent snapshot-detail review flow. A caller typically identifies the relevant historical snapshot first, then retrieves the option-value records to understand the preserved option combination that existed at that time. When the snapshot is part of a broader product snapshot, these option-value entries contribute to the complete reconstruction of the product offering, alongside the preserved variant state, preserved SKU context, and any related historical product snapshot material.
 *
 * Returned records are immutable historical artifacts. The service should treat them strictly as preserved evidence of a prior variant state and should not attempt to reinterpret them as current variant configuration. If the target product, variant, or snapshot does not exist, or if the authenticated seller does not own the product, the request must be rejected. If the snapshot exists but contains no option-value rows, the service should return an empty paginated result rather than fabricate inferred options.
 *
 * @param props.connection
 * @param props.productId Target product's ID
 * @param props.variantId Target product variant's ID
 * @param props.productVariantSnapshotId Target product variant snapshot's ID
 * @param props.body Pagination, filtering, and sorting options for historical snapshot option values
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor administrator
 * @x-autobe-specification Implement this operation as a paginated historical
 *   child-list query over
 *   `shopping_mall_product_variant_snapshot_option_values` scoped by product,
 *   variant, and variant snapshot.
 *
 * 1. Authenticate the caller and authorize only seller or administrator actors. If the caller is a seller, join `shopping_mall_products` and verify that `shopping_mall_products.id = {productId}` and `shopping_mall_products.shopping_mall_seller_id` matches the authenticated seller account. If the caller is an administrator, allow platform-wide access. Reject all other actors.
 *
 * 2. Validate path hierarchy before querying child rows. Confirm that `shopping_mall_product_variants.id = {variantId}` and `shopping_mall_product_variants.shopping_mall_product_id = {productId}`. Confirm that `shopping_mall_product_variant_snapshots.id = {productVariantSnapshotId}` and `shopping_mall_product_variant_snapshots.shopping_mall_product_variant_id = {variantId}`. These checks must happen before reading option-value rows so mismatched nested identifiers fail deterministically.
 *
 * 3. Read from `shopping_mall_product_variant_snapshot_option_values` where `shopping_mall_product_variant_snapshot_id = {productVariantSnapshotId}`. Support request-body driven pagination, sorting, and optional text filtering only on verified schema fields. Safe searchable fields from the loaded schema are `name` and `value`. Safe sortable fields are `created_at`, `updated_at`, `name`, and `value`. Because these are historical records, do not provide mutation behavior and do not derive or overwrite values from the current variant table.
 *
 * 4. Prefer excluding rows with non-null `deleted_at` unless the request DTO explicitly supports inclusion of logically removed snapshot option entries. If such a flag is not present in the generated request schema, default to active historical rows only. Do not assume any additional filters beyond the request DTO.
 *
 * 5. Return a paginated response of summary objects derived from the snapshot option-value entity. Each item should include the preserved option key and option value, along with identifiers and timestamps defined by the DTO schema. Preserve stable ordering when the caller does not specify one by applying a deterministic secondary order such as `created_at ASC, id ASC`.
 *
 * 6. Error handling: return not found when the product, variant, or snapshot does not exist in the required hierarchy; return forbidden when a seller requests history for another seller's product; return success with an empty page when the validated snapshot has no option-value children. No transaction is required beyond consistent read semantics because this operation is read-only over immutable historical data.
 * @path /shoppingMall/administrator/products/:productId/variants/:variantId/snapshots/:productVariantSnapshotId/option-values
 * @accessor api.functional.shoppingMall.administrator.products.variants.snapshots.option_values.index
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
     * Target product variant's ID
     */
    variantId: string & tags.Format<"uuid">;

    /**
     * Target product variant snapshot's ID
     */
    productVariantSnapshotId: string & tags.Format<"uuid">;

    /**
     * Pagination, filtering, and sorting options for historical snapshot option values
     */
    body: IShoppingMallProductVariantSnapshotOptionValue.IRequest;
  };
  export type Body = IShoppingMallProductVariantSnapshotOptionValue.IRequest;
  export type Response =
    IPageIShoppingMallProductVariantSnapshotOptionValue.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/administrator/products/:productId/variants/:variantId/snapshots/:productVariantSnapshotId/option-values",
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
    `/shoppingMall/administrator/products/${encodeURIComponent(props.productId ?? "null")}/variants/${encodeURIComponent(props.variantId ?? "null")}/snapshots/${encodeURIComponent(props.productVariantSnapshotId ?? "null")}/option-values`;
  export const random =
    (): IPageIShoppingMallProductVariantSnapshotOptionValue.ISummary =>
      typia.random<IPageIShoppingMallProductVariantSnapshotOptionValue.ISummary>();
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
      assert.param("productVariantSnapshotId")(() =>
        typia.assert(props.productVariantSnapshotId),
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
 * Retrieve one preserved option-value entry from a product variant snapshot history record.
 *
 * This operation provides detail access to an immutable historical option entry stored under a specific product variant snapshot. In the database model, `shopping_mall_product_variant_snapshot_option_values` is the normalized child structure that preserves each snapshot-time option key and value, such as color or size, so historical variant configurations remain queryable without packing option data into arrays, JSON, or composite strings. The returned record therefore represents one atomic part of the preserved variant state that existed at the historical point captured by the parent snapshot.
 *
 * The route is intentionally nested through `shopping_mall_products`, `shopping_mall_product_variants`, `shopping_mall_product_variant_snapshots`, and finally the snapshot option-value row so the caller must identify the complete ownership chain of the historical record. This aligns with the business requirement that variant snapshot history is reviewed in the context of the seller-owned product and variant, and with the schema relationships where the option-value row belongs to a single variant snapshot, the snapshot belongs to a source variant, and the variant belongs to a product. The operation should only return a record when all parent-child relationships match the supplied path parameters.
 *
 * Access to this operation is restricted to relevant parties who are authorized to inspect variant history. Sellers may review snapshot history only for variants of their own products, which supports dispute handling and historical understanding of SKU code, option values, and price changes over time. Administrators may review variant snapshot history for any product on the platform, including products or variants that are no longer active in current listings. The system must not expose one seller's historical variant data to another seller, and customers are not part of the allowed audience for this history view.
 *
 * This operation is a historical-read endpoint and does not alter current catalog data. The parent snapshot and its option-value children are preserved records used for audit, comparison, and dispute-resolution history. If the live variant has later changed or has been deleted from active management, the preserved snapshot option-value record can still be retrieved through this endpoint when the requesting party is authorized and the historical record still exists.
 *
 * This operation is commonly used together with the parent historical review endpoints for product variant snapshots. A caller would typically first identify the relevant variant snapshot from its history list or detail view, then request the specific option-value record when a precise atomic entry must be inspected or validated as part of a dispute or timeline review.
 *
 * @param props.connection
 * @param props.productId Target product identifier that scopes seller ownership and variant lineage
 * @param props.variantId Target product variant identifier belonging to the specified product
 * @param props.productVariantSnapshotId Target product variant snapshot identifier belonging to the specified variant
 * @param props.optionValueId Target snapshot option value identifier belonging to the specified variant snapshot
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor administrator
 * @x-autobe-specification Implement a read-only detail query over
 *   `shopping_mall_product_variant_snapshot_option_values` with strict
 *   parent-chain validation.
 *
 * 1. Authenticate the requester and authorize only seller or administrator actors.
 * 2. For seller actors, join `shopping_mall_products` and verify that `shopping_mall_products.id = {productId}` and `shopping_mall_products.shopping_mall_seller_id` matches the authenticated seller account. For administrator actors, skip seller-ownership filtering but still validate the hierarchy.
 * 3. Validate the full hierarchy in a single query or equivalent transaction-safe sequence:
 *    - `shopping_mall_products.id = {productId}`
 *    - `shopping_mall_product_variants.id = {variantId}` and `shopping_mall_product_variants.shopping_mall_product_id = shopping_mall_products.id`
 *    - `shopping_mall_product_variant_snapshots.id = {productVariantSnapshotId}` and `shopping_mall_product_variant_snapshots.shopping_mall_product_variant_id = shopping_mall_product_variants.id`
 *    - `shopping_mall_product_variant_snapshot_option_values.id = {optionValueId}` and `shopping_mall_product_variant_snapshot_option_values.shopping_mall_product_variant_snapshot_id = shopping_mall_product_variant_snapshots.id`
 * 4. Return the matched snapshot option-value record as a single DTO. Include fields that map to the immutable historical option entry itself, especially its identifier, parent snapshot identifier, option `name`, option `value`, and timestamps that exist in the schema.
 * 5. Because the schema includes `deleted_at` on snapshot option-value rows, treat rows with a non-null `deleted_at` as not normally available unless the project-wide read policy for preserved snapshot artifacts explicitly includes them. In the absence of a broader override, prefer filtering to rows whose preserved record is still considered available for review.
 * 6. If any ancestor record does not exist, the chain does not match, or the seller does not own the product, reject the request as not found or forbidden according to the service's standard authorization/error policy. Do not leak whether a foreign seller's record exists.
 * 7. Do not mutate any snapshot, variant, or product state. No snapshot reconstruction should be performed here beyond validating lineage.
 *
 * Implementation should favor one joined query for correctness and to avoid partial existence leakage. The operation is read-only and does not require an explicit transaction unless the surrounding infrastructure mandates consistent read semantics.
 * @path /shoppingMall/administrator/products/:productId/variants/:variantId/snapshots/:productVariantSnapshotId/option-values/:optionValueId
 * @accessor api.functional.shoppingMall.administrator.products.variants.snapshots.option_values.at
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
     * Target product identifier that scopes seller ownership and variant lineage
     */
    productId: string & tags.Format<"uuid">;

    /**
     * Target product variant identifier belonging to the specified product
     */
    variantId: string & tags.Format<"uuid">;

    /**
     * Target product variant snapshot identifier belonging to the specified variant
     */
    productVariantSnapshotId: string & tags.Format<"uuid">;

    /**
     * Target snapshot option value identifier belonging to the specified variant snapshot
     */
    optionValueId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallProductVariantSnapshotOptionValue;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/administrator/products/:productId/variants/:variantId/snapshots/:productVariantSnapshotId/option-values/:optionValueId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/administrator/products/${encodeURIComponent(props.productId ?? "null")}/variants/${encodeURIComponent(props.variantId ?? "null")}/snapshots/${encodeURIComponent(props.productVariantSnapshotId ?? "null")}/option-values/${encodeURIComponent(props.optionValueId ?? "null")}`;
  export const random = (): IShoppingMallProductVariantSnapshotOptionValue =>
    typia.random<IShoppingMallProductVariantSnapshotOptionValue>();
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
      assert.param("productVariantSnapshotId")(() =>
        typia.assert(props.productVariantSnapshotId),
      );
      assert.param("optionValueId")(() => typia.assert(props.optionValueId));
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
