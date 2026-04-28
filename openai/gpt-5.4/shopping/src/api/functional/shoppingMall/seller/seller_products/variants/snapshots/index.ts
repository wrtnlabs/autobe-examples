import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallProductVariantSnapshot } from "../../../../../../structures/IPageIShoppingMallProductVariantSnapshot";
import { IShoppingMallProductVariantSnapshot } from "../../../../../../structures/IShoppingMallProductVariantSnapshot";

export * as option_values from "./option_values/index";

/**
 * Retrieve a filtered and paginated list of immutable snapshot records for a specific seller product variant.
 *
 * This operation exposes the historical review capability for product variant change events. It returns preserved records from the product variant snapshot history for the variant identified within the specified seller product context. In the underlying data model, the current mutable variant is stored in `shopping_mall_product_variants` with seller-managed fields such as `sku_code`, `option_summary`, and optional `price`, while each historical event is preserved in `shopping_mall_product_variant_snapshots` with its own `change_summary` and `created_at` timestamp. This separation reflects the domain rule that current editable state and immutable history are distinct records.
 *
 * The endpoint is intended for relevant parties defined by the requirements. The variant owner may review snapshots of variants belonging to that owner’s products, and administrators may review product variant snapshots for oversight and dispute resolution. Because variant management is owner-only at the product boundary, the server must interpret the `{productId}` and `{variantId}` pair together and reject requests where the variant does not belong to the specified product or where a seller attempts to access a product owned by another seller.
 *
 * This history view must support the business requirement that variant edits preserve prior and updated state over time. Requirements state that editing a variant creates snapshot history and that preserved variant history includes SKU code history, option values history, and variant price history for the edit. Requirements also state that variant snapshots can participate in complete product snapshot reconstruction. For that reason, returned records should be suitable both for standalone history browsing and for understanding whether a snapshot was linked to a broader product snapshot capture at the same historical point.
 *
 * The operation is designed as a list retrieval with a request body because historical browsing commonly requires pagination, sorting, and filter criteria such as partial matching on `change_summary` and date-range constraints on `created_at`. This aligns with the data browsing expectations for list exploration and with the immutable, append-only nature of `shopping_mall_product_variant_snapshots`. Clients should use this endpoint before opening a dedicated detail view of a specific snapshot when deeper inspection is required.
 *
 * Expected behavior is to return only snapshot records associated with the target variant after validating the product-variant relationship and caller authorization. If the product does not exist, the variant does not exist, the variant is not a child of the specified product, or the caller lacks permission under seller ownership or administrator oversight rules, the request must be rejected. If no historical records match the provided search criteria, the operation should return an empty paginated result rather than treating the condition as an error.
 *
 * @param props.connection
 * @param props.productId Target seller product identifier
 * @param props.variantId Target product variant identifier within the specified product
 * @param props.body Search criteria and pagination options for product variant snapshot history
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification 1. Authenticate the caller and authorize access for
 *   either (a) the seller who owns the target product or (b) an administrator
 *   with oversight permissions. Do not allow general customer access.
 *
 * 2. Validate `productId` and `variantId` as UUID identifiers. Load the target product from `shopping_mall_products` by `id`. Load the target variant from `shopping_mall_product_variants` by `id` and verify `shopping_mall_product_id = productId`. If either record is missing, or if the variant does not belong to the given product, reject the request.
 *
 * 3. For seller callers, verify that `shopping_mall_products.shopping_mall_seller_id` matches the authenticated seller account. This enforces the owner-only variant management boundary described in requirements. Administrators may bypass seller ownership matching for oversight and dispute review.
 *
 * 4. Query `shopping_mall_product_variant_snapshots` constrained by `shopping_mall_product_variant_id = variantId`. Support request-body driven filtering such as partial search on `change_summary`, optional created-at from/to boundaries, and optional filtering on whether `shopping_mall_product_snapshot_id` is null or not null if the request DTO defines that capability.
 *
 * 5. Apply deterministic sorting. Default sort should be `created_at desc` so the newest immutable history appears first. If alternative supported sort fields are provided by the request DTO, validate them against an allowlist and never allow arbitrary raw column input.
 *
 * 6. Apply pagination using the common paginated list contract expected by the request and response DTOs. Return a paginated result object whose data items are summary projections of product variant snapshots. Each summary row should include identifiers and review-friendly metadata required for history browsing, especially `id`, `change_summary`, `created_at`, and any linkage indicator for the enclosing product snapshot.
 *
 * 7. If response enrichment is required by the summary DTO, join minimally to `shopping_mall_product_variants` to expose stable contextual information about the source variant, but do not treat current mutable fields as historical truth unless the DTO explicitly models them as current context. Historical details beyond the snapshot row itself should be retrieved from dedicated snapshot detail structures where applicable.
 *
 * 8. Preserve immutable-history semantics. This operation must never modify snapshot data, create new snapshot rows, or delete any snapshot rows. It is a read-only browsing endpoint over append-only historical artifacts.
 *
 * 9. Handle edge cases explicitly: return not found when product or variant does not exist in the requested hierarchy; return forbidden when a seller requests snapshots outside that seller's ownership boundary; return a successful empty page when the hierarchy is valid but no snapshot rows match the filters; and ensure soft-deleted current variants do not prevent access to preserved historical snapshots when authorization and hierarchy are valid.
 *
 * 10. Keep implementation efficient by using the existing indexes on `shopping_mall_product_variant_snapshots(shopping_mall_product_variant_id, created_at)` and, when searching `change_summary`, rely on the trigram GIN index instead of full table scans.
 * @path /shoppingMall/seller/seller-products/:productId/variants/:variantId/snapshots
 * @accessor api.functional.shoppingMall.seller.seller_products.variants.snapshots.index
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
     * Target seller product identifier
     */
    productId: string & tags.Format<"uuid">;

    /**
     * Target product variant identifier within the specified product
     */
    variantId: string & tags.Format<"uuid">;

    /**
     * Search criteria and pagination options for product variant snapshot history
     */
    body: IShoppingMallProductVariantSnapshot.IRequest;
  };
  export type Body = IShoppingMallProductVariantSnapshot.IRequest;
  export type Response = IPageIShoppingMallProductVariantSnapshot.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/seller/seller-products/:productId/variants/:variantId/snapshots",
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
    `/shoppingMall/seller/seller-products/${encodeURIComponent(props.productId ?? "null")}/variants/${encodeURIComponent(props.variantId ?? "null")}/snapshots`;
  export const random = (): IPageIShoppingMallProductVariantSnapshot.ISummary =>
    typia.random<IPageIShoppingMallProductVariantSnapshot.ISummary>();
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
 * Retrieve a single immutable product variant snapshot record for historical review of a seller-owned product variant.
 *
 * This operation returns one preserved historical state from the product variant snapshot history associated with a specific product and variant. In the underlying data model, `shopping_mall_product_variants` stores the current mutable SKU-level variant definition for a seller-owned `shopping_mall_products` record, while `shopping_mall_product_variant_snapshots` stores append-only, point-in-time history records for snapshot events. Each snapshot may also have normalized option entries in `shopping_mall_product_variant_snapshot_option_values`, allowing the preserved option combination to remain queryable as atomic name/value pairs rather than as a single composite string. The operation fulfills the requirement that relevant parties be able to review preserved SKU code history, option values history, and variant price history for a historical point.
 *
 * Access to this operation is restricted by ownership and oversight rules. A seller may retrieve snapshot history only for variants that belong to that seller’s own products. An administrator may retrieve snapshot history for any product on the platform, including products that are currently active or were later removed from active listings. The system must not disclose one seller’s variant history to another seller. These access checks are especially important because the history is intended for maintenance review, audit support, and dispute handling rather than public storefront browsing.
 *
 * This operation is tightly related to the variant editing workflow. When variant details such as SKU code, option values, or variant price are edited, the system preserves the change as an immutable snapshot event. The returned record therefore represents a historical state rather than the current sellable state in `shopping_mall_product_variants`. If the snapshot was captured as part of a broader product snapshot, the historical record may also participate in reconstruction of the complete product offering at that moment, because product snapshots preserve both the product-level fields and the included variant snapshots together.
 *
 * The system should validate that the provided `productId`, `variantId`, and `productVariantSnapshotId` form a consistent hierarchy. A request must fail when the product does not exist, the variant does not belong to the specified product, or the snapshot does not belong to the specified variant. A request must also fail when the caller lacks permission to review the snapshot history. When successful, the response returns the detailed immutable snapshot record for historical inspection, including its preserved metadata and any associated option entries defined for that snapshot context.
 *
 * @param props.connection
 * @param props.productId Target seller product's ID
 * @param props.variantId Target product variant's ID
 * @param props.productVariantSnapshotId Target product variant snapshot's ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Implement this operation as a detail lookup over the
 *   seller product, variant, and snapshot hierarchy.
 *
 * 1. Load the target `shopping_mall_product_variant_snapshots` row by `productVariantSnapshotId` and join its parent `shopping_mall_product_variants` row and parent `shopping_mall_products` row. Also load child `shopping_mall_product_variant_snapshot_option_values` rows ordered consistently for stable output.
 * 2. Validate hierarchy consistency before returning data:
 *    - `shopping_mall_products.id` must equal `productId`.
 *    - `shopping_mall_product_variants.id` must equal `variantId`.
 *    - `shopping_mall_product_variant_snapshots.id` must equal `productVariantSnapshotId`.
 *    - `shopping_mall_product_variants.shopping_mall_product_id` must match the parent product.
 *    - `shopping_mall_product_variant_snapshots.shopping_mall_product_variant_id` must match the parent variant.
 * 3. Authorize by actor:
 *    - For seller actor, require `shopping_mall_products.shopping_mall_seller_id` to equal the authenticated seller account id.
 *    - For administrator actor, allow access without seller ownership restriction.
 *    - Reject all other actors.
 * 4. Map the database result into `IShoppingMallProductVariantSnapshot`. Include snapshot metadata from `shopping_mall_product_variant_snapshots`, and include normalized option values from `shopping_mall_product_variant_snapshot_option_values`. If the DTO model includes current or parent references, populate only fields supported by the schema contracts generated elsewhere; do not invent undeclared properties.
 * 5. Preserve immutable-history semantics: this operation is read-only and must not alter snapshot, variant, or product records. Do not create, update, or delete any rows during retrieval.
 *
 * Error handling:
 * - Return not found when any of the three identifiers does not resolve to a consistent product → variant → snapshot chain.
 * - Return forbidden when a seller attempts to access a snapshot outside the seller’s own product ownership.
 * - Return unauthorized when the caller is unauthenticated.
 * - Return success for historical snapshots even if the current variant is deleted or the current product is no longer listed, so long as authorization and relational consistency checks pass.
 *
 * Performance guidance:
 * - Use indexed lookups on snapshot id and relational foreign keys.
 * - Avoid N+1 queries by fetching option values in the same transaction scope or with a single additional batched query.
 * - Keep ordering of option values deterministic, such as by `name` then `created_at`, to support stable comparison views.
 * @path /shoppingMall/seller/seller-products/:productId/variants/:variantId/snapshots/:productVariantSnapshotId
 * @accessor api.functional.shoppingMall.seller.seller_products.variants.snapshots.at
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
  };
  export type Response = IShoppingMallProductVariantSnapshot;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/seller/seller-products/:productId/variants/:variantId/snapshots/:productVariantSnapshotId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/seller/seller-products/${encodeURIComponent(props.productId ?? "null")}/variants/${encodeURIComponent(props.variantId ?? "null")}/snapshots/${encodeURIComponent(props.productVariantSnapshotId ?? "null")}`;
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
      assert.param("variantId")(() => typia.assert(props.variantId));
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
