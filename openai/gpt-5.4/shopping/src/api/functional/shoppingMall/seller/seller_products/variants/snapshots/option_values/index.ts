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
 * Retrieve a paginated list of preserved option-value entries for a specific product variant snapshot.
 *
 * This operation exposes the normalized historical option values stored under a single product variant snapshot so that relevant parties can review exactly which option combination was preserved at that historical moment. In the database model, `shopping_mall_product_variant_snapshots` is an immutable point-in-time history record for a live `shopping_mall_product_variants` row, and `shopping_mall_product_variant_snapshot_option_values` stores each captured option key and value, such as color or size, as atomic historical entries. Together, these records allow the system to show the preserved purchasable definition of the variant without relying on mutable current-state data.
 *
 * The endpoint is nested under `/seller-products/{productId}/variants/{variantId}/snapshots/{productVariantSnapshotId}` to reflect the actual business relationship and authorization scope. A seller may review snapshot history only for variants that belong to that seller’s own product, consistent with the owner-only variant management rule. Administrators may also use this operation for oversight and dispute-resolution review because the requirements state that administrators shall be able to review product variant snapshots when historical review is needed. The implementation must therefore confirm that the specified snapshot belongs to the specified variant and that the variant belongs to the specified product before returning any option-value history.
 *
 * This operation documents historical state, not current merchandising state. The returned entries come from the subsidiary snapshot-support table that preserves each option name and value in normalized form so historical combinations remain queryable and reviewable. The table comment explicitly describes these rows as atomic option name and value entries captured for a product variant snapshot and retained for audit, comparison, and dispute-resolution history. Because the underlying snapshot is immutable, the option-value records returned by this operation are also historical evidence and must be treated as read-only from an API consumer perspective.
 *
 * This operation is commonly used together with the parent snapshot-detail retrieval flow. A client typically identifies the relevant variant snapshot first from the variant snapshot history, then calls this endpoint to inspect the preserved option combination attached to that snapshot. When the snapshot is part of a broader product snapshot, the returned option values help users understand how the full product and variant configuration looked at that historical point. If the supplied product, variant, and snapshot relationship is inconsistent, or if the caller is not authorized to review that seller-owned history, the operation must fail rather than exposing historical records outside the proper ownership or oversight boundary.
 *
 * @param props.connection
 * @param props.productId Target seller product's ID
 * @param props.variantId Target product variant's ID
 * @param props.productVariantSnapshotId Target product variant snapshot's ID
 * @param props.body Pagination, sorting, and search criteria for snapshot option values
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Accept a JSON request body of type `IShoppingMallProductVariantSnapshotOptionValue.IRequest` containing pagination, sorting, and optional search criteria for historical option entries.
 *
 * Authorize the caller as either the seller who owns the parent product or an administrator performing oversight review. For seller access, resolve `shopping_mall_products` by `productId` and verify its `shopping_mall_seller_id` belongs to the authenticated seller. Then verify that `shopping_mall_product_variants.id = variantId` and `shopping_mall_product_variants.shopping_mall_product_id = productId`. Then verify that `shopping_mall_product_variant_snapshots.id = productVariantSnapshotId` and `shopping_mall_product_variant_snapshots.shopping_mall_product_variant_id = variantId`. Reject the request if any link in this parent-child chain is missing or mismatched.
 *
 * Query `shopping_mall_product_variant_snapshot_option_values` filtered by `shopping_mall_product_variant_snapshot_id = productVariantSnapshotId`. Apply optional text search against `name` and `value` if the request DTO supports keyword filtering. Support deterministic sorting, defaulting to a stable order such as `created_at` ascending and then `id` ascending so the preserved option combination is reproduced consistently. Return paginated results as `IPageIShoppingMallProductVariantSnapshotOptionValue.ISummary`.
 *
 * Do not mutate any snapshot or option-value data. These rows are historical snapshot-support records managed automatically at snapshot creation time and retained for audit and dispute review. Exclude any row whose `deleted_at` is not null if the service policy treats logically removed subsidiary records as non-browsable historical noise; otherwise return all rows tied to the snapshot consistently with repository conventions. Error when the product, variant, or snapshot does not exist in the required ownership chain, or when the caller lacks permission to review the requested historical records.
 * @path /shoppingMall/seller/seller-products/:productId/variants/:variantId/snapshots/:productVariantSnapshotId/option-values
 * @accessor api.functional.shoppingMall.seller.seller_products.variants.snapshots.option_values.index
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
     * Target seller product's ID
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
     * Pagination, sorting, and search criteria for snapshot option values
     */
    body: IShoppingMallProductVariantSnapshotOptionValue.IRequest;
  };
  export type Body = IShoppingMallProductVariantSnapshotOptionValue.IRequest;
  export type Response =
    IPageIShoppingMallProductVariantSnapshotOptionValue.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/seller/seller-products/:productId/variants/:variantId/snapshots/:productVariantSnapshotId/option-values",
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
    `/shoppingMall/seller/seller-products/${encodeURIComponent(props.productId ?? "null")}/variants/${encodeURIComponent(props.variantId ?? "null")}/snapshots/${encodeURIComponent(props.productVariantSnapshotId ?? "null")}/option-values`;
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
 * This operation returns an atomic historical option entry stored under `shopping_mall_product_variant_snapshot_option_values`, which the database schema defines as the normalized structure that preserves each snapshot-time option name and value, such as color or size, for a specific `shopping_mall_product_variant_snapshots` record. Its purpose is to let an authorized viewer inspect the exact option component that formed part of a variant's immutable historical state rather than relying on denormalized summaries or reconstructed guesses.
 *
 * The endpoint is intended for historical review workflows described in the requirements for product variant snapshot history. Relevant parties must be able to view preserved SKU code, option values, and variant price at a historical point, and this child record supports that review by exposing one concrete option key/value pair belonging to the selected snapshot. Sellers may use it only for variants under products they own, while administrators may use it for oversight, dispute resolution, and review of products that may no longer be actively listed.
 *
 * The operation traverses the full ownership and history chain represented by `shopping_mall_products`, `shopping_mall_product_variants`, `shopping_mall_product_variant_snapshots`, and `shopping_mall_product_variant_snapshot_option_values`. The implementation must confirm that the variant belongs to the specified product, that the snapshot belongs to the specified variant, and that the option-value row belongs to the specified snapshot before returning data. This prevents cross-link access where a valid child identifier is supplied under the wrong parent path.
 *
 * Because the schema comment for `shopping_mall_product_variant_snapshots` defines these records as immutable point-in-time history records and the option-value table defines its rows as normalized historical entries retained for audit, comparison, and dispute-resolution history, this API is read-only and should be documented as a historical inspection endpoint rather than a live catalog-management endpoint. It may be used together with broader snapshot-history listing or detail operations that first help the caller identify the target snapshot before opening an individual option value entry for close inspection.
 *
 * If any parent resource in the chain is not found, does not belong to the specified parent, or is not authorized for the requesting actor, the system must reject the request. If the seller attempts to inspect snapshot history for another seller's product, the request must be denied. Successful responses should describe the preserved option key and preserved option value exactly as recorded for that historical snapshot entry.
 *
 * @param props.connection
 * @param props.productId Target product's ID
 * @param props.variantId Target variant's ID under the specified product
 * @param props.productVariantSnapshotId Target product variant snapshot's ID under the specified variant
 * @param props.optionValueId Target historical option value entry ID under the specified snapshot
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Implement a read-only detail query for one `shopping_mall_product_variant_snapshot_option_values` row.
 *
 * 1. Authenticate the caller and require either a seller or administrator actor.
 * 2. Resolve the parent chain using the provided UUID path parameters:
 *    - load `shopping_mall_products` by `id = productId`
 *    - load `shopping_mall_product_variants` by `id = variantId` and confirm `shopping_mall_product_id = productId`
 *    - load `shopping_mall_product_variant_snapshots` by `id = productVariantSnapshotId` and confirm `shopping_mall_product_variant_id = variantId`
 *    - load `shopping_mall_product_variant_snapshot_option_values` by `id = optionValueId` and confirm `shopping_mall_product_variant_snapshot_id = productVariantSnapshotId`
 * 3. Authorization rules:
 *    - if caller is seller, confirm the resolved product row has `shopping_mall_seller_id` equal to the authenticated seller account id; otherwise reject
 *    - if caller is administrator, allow platform-wide access
 *    - do not allow customers or unauthenticated users
 * 4. Return the single option-value entity mapped from the snapshot option-value row. The response should expose the preserved historical fields `id`, parent snapshot reference, `name`, `value`, and audit timestamps as defined by the DTO.
 * 5. Treat this as historical review data. Do not mutate snapshot rows, do not recalculate the option content from current variant data, and do not replace preserved values with current live product state.
 * 6. Error handling:
 *    - return not found when any resource in the chain does not exist
 *    - return not found or forbidden-equivalent handling when the child does not belong to the specified parent chain
 *    - return forbidden when a seller requests history for a product owned by another seller
 * 7. Performance guidance:
 *    - prefer a single joined query or tightly scoped sequential lookups with parent-child constraints in SQL predicates to avoid returning mismatched nested resources
 *    - select only the fields required for the detail DTO unless additional metadata is mandated by the shared DTO definition.
 * @path /shoppingMall/seller/seller-products/:productId/variants/:variantId/snapshots/:productVariantSnapshotId/option-values/:optionValueId
 * @accessor api.functional.shoppingMall.seller.seller_products.variants.snapshots.option_values.at
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
     * Target variant's ID under the specified product
     */
    variantId: string & tags.Format<"uuid">;

    /**
     * Target product variant snapshot's ID under the specified variant
     */
    productVariantSnapshotId: string & tags.Format<"uuid">;

    /**
     * Target historical option value entry ID under the specified snapshot
     */
    optionValueId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallProductVariantSnapshotOptionValue;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/seller/seller-products/:productId/variants/:variantId/snapshots/:productVariantSnapshotId/option-values/:optionValueId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/seller/seller-products/${encodeURIComponent(props.productId ?? "null")}/variants/${encodeURIComponent(props.variantId ?? "null")}/snapshots/${encodeURIComponent(props.productVariantSnapshotId ?? "null")}/option-values/${encodeURIComponent(props.optionValueId ?? "null")}`;
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
