import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallSellerProfileSnapshot } from "../../../../../structures/IPageIShoppingMallSellerProfileSnapshot";
import { IShoppingMallSellerProfileSnapshot } from "../../../../../structures/IShoppingMallSellerProfileSnapshot";

/**
 * Retrieve a filtered and paginated history of the authenticated seller's profile snapshots.
 *
 * This operation returns immutable historical records from the seller profile snapshot history associated with the signed-in seller's public storefront identity. The underlying live profile is stored in `shopping_mall_seller_profiles`, which represents the seller's active shop-facing profile shown to customers through fields such as `shop_name`, `shop_description`, and `logo_uri`. The historical records are stored separately in `shopping_mall_seller_profile_snapshots`, an append-only table that preserves the prior public shop identity state whenever an accepted seller profile edit occurs. Each returned snapshot contains the preserved shop name, preserved shop description, preserved logo URI, a concise `changed_summary`, and the business timestamps `changed_at`, `created_at`, and `updated_at` needed for chronological review.
 *
 * The operation is intended for authenticated sellers reviewing the history of changes to their own storefront presentation. This reflects the business separation between seller account identity and seller profile presentation: the seller account handles marketplace membership and authentication, while the seller profile is the customer-visible shop identity. Because historical review is tied to the seller's own storefront, the endpoint is scoped to the authenticated seller context rather than exposing arbitrary profile identifiers in the route.
 *
 * The returned records support dispute resolution, audit review, and historical inspection. Requirements specify that whenever an accepted seller profile edit occurs, the system creates a snapshot that records when the change was made, what was changed, and the values before and after the edit. In database terms, the snapshot table directly stores the preserved seller-facing values and the `changed_summary` metadata. Consumers should use this endpoint when they need to inspect how the public shop identity evolved over time, for example after changes to the shop name, shop description, or logo image.
 *
 * This operation only reads preserved history. It does not create snapshots directly, because snapshot creation is a system-managed consequence of accepted seller profile edits. It also does not modify or remove snapshot records. The requirements and schema comments establish that seller profile snapshots are immutable after insertion and must remain available for historical reference. If the seller wants to generate new history, the related current-profile update operation must be executed first; afterward, this history endpoint can be called to review the newly preserved snapshot timeline.
 *
 * Filtering, sorting, and pagination are supported so sellers can browse long profile histories efficiently. Typical client usage includes sorting by `changedAt` descending to view the newest preserved changes first, filtering by date range, and searching by `changedSummary` or preserved textual fields when locating a particular edit event. When the authenticated seller has no recorded accepted edits yet, the operation returns an empty paginated result rather than creating any new history.
 *
 * @param props.connection
 * @param props.body Seller profile snapshot history query options
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Resolve the authenticated seller from the session context and load that seller's single active seller profile from `shopping_mall_seller_profiles` using the unique foreign key `shopping_mall_seller_id`. Reject the request if there is no authenticated seller context or if no seller profile exists for the authenticated seller.
 *
 * Query `shopping_mall_seller_profile_snapshots` for rows whose `shopping_mall_seller_profile_id` matches the resolved seller profile. Build the query from `IShoppingMallSellerProfileSnapshot.IRequest`, supporting pagination, deterministic sorting, and optional filters that are grounded in actual schema fields only. Valid searchable fields include `shop_name`, `shop_description`, `changed_summary`, `changed_at`, and `created_at`. Prefer default ordering by `changed_at` descending and secondarily by `id` descending to keep stable pagination when timestamps are identical.
 *
 * Return a paginated `IPageIShoppingMallSellerProfileSnapshot.ISummary` payload containing only the authenticated seller's own snapshot records. Do not expose or merge snapshot history from other sellers. Do not mutate snapshot rows during retrieval. Do not synthesize missing history records. If no matching rows exist, return an empty page with valid pagination metadata.
 *
 * Implementation should treat snapshot rows as immutable historical artifacts. The service must never update `shop_name`, `shop_description`, `logo_uri`, `changed_summary`, `changed_at`, `created_at`, or `updated_at` during this read operation. If the seller profile record is marked inactive through `deleted_at`, the service may still return historical snapshots for authorized historical inspection if the authenticated seller owns that profile, because the requirements emphasize preservation and continued review of immutable history.
 *
 * Validation should reject malformed pagination or sort input according to the request DTO rules. Error handling should distinguish authorization failure from missing owned profile context. This endpoint has no dependency on external integrations and should execute as a read-only database operation without a write transaction.
 * @path /shoppingMall/seller/profile/snapshots
 * @accessor api.functional.shoppingMall.seller.profile.snapshots.index
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
          path: index.path(),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Seller profile snapshot history query options
     */
    body: IShoppingMallSellerProfileSnapshot.IRequest;
  };
  export type Body = IShoppingMallSellerProfileSnapshot.IRequest;
  export type Response = IPageIShoppingMallSellerProfileSnapshot.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/seller/profile/snapshots",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/seller/profile/snapshots";
  export const random = (): IPageIShoppingMallSellerProfileSnapshot.ISummary =>
    typia.random<IPageIShoppingMallSellerProfileSnapshot.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(),
      contentType: "application/json",
    });
    try {
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
 * Retrieve one immutable seller profile snapshot record by its identifier.
 *
 * This operation returns a preserved historical view of a seller's public storefront identity from the seller profile history owned by the active seller profile record. It is based on the immutable `shopping_mall_seller_profile_snapshots` table, which stores the prior public shop identity state captured when editable storefront information changed. The returned record includes the preserved `shop_name`, optional `shop_description`, optional `logo_uri`, the human-readable `changed_summary`, and the business timestamp `changed_at` that places the change in time.
 *
 * The endpoint exists to support audit review, dispute resolution, and historical inspection of seller-facing presentation changes. Requirements state that whenever a seller profile is edited, the system creates a separate immutable snapshot, records when the change was made, records what was changed, and preserves before-and-after context through readable change history. This endpoint exposes one such preserved record so an authorized caller can inspect exactly which seller profile state was retained for that edit event without altering the current active `shopping_mall_seller_profiles` row.
 *
 * Access to this operation must be restricted to the relevant seller who owns the associated seller profile and to administrators who need to review preserved history. The operation must not expose arbitrary seller history to unrelated actors. If the snapshot identifier does not exist, or if the caller is not authorized to inspect the associated seller profile history, the system must reject the request without modifying any data. Because snapshot rows are immutable and append-only, this operation is strictly read-only and has no side effects.
 *
 * This operation is commonly used together with seller profile management and seller profile history browsing flows. A seller or administrator may first obtain a list of available history entries from a separate snapshot listing operation, then call this detail endpoint with the chosen `snapshotId` to inspect the exact preserved shop name, description, logo URI, and change metadata for one historical revision.
 *
 * @param props.connection
 * @param props.snapshotId Target seller profile snapshot identifier
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Implement this operation as a read-only detail query against `shopping_mall_seller_profile_snapshots` filtered by the primary key `id = :snapshotId`.
 *
 * After loading the snapshot row, join or separately load the related `shopping_mall_seller_profiles` row through `shopping_mall_seller_profile_id` to perform authorization checks. Allow access only when the authenticated actor is the seller who owns the related seller profile or when the authenticated actor is an administrator with oversight authority. Do not allow unrelated sellers, customers, or anonymous users to read the record.
 *
 * Return a single `IShoppingMallSellerProfileSnapshot` DTO populated from the snapshot row. Map `shop_name`, `shop_description`, `logo_uri`, `changed_summary`, `changed_at`, `created_at`, and `updated_at` directly from the database schema. Preserve nullability for `shop_description` and `logo_uri` exactly as stored in the snapshot row.
 *
 * If no snapshot exists for the provided identifier, return a not-found error. If the caller lacks permission to inspect the related seller profile history, return a forbidden or unauthorized error according to the authentication state. Do not perform any update, delete, or recovery behavior because snapshot rows are immutable and must remain unchanged after insertion.
 *
 * For consistency with snapshot-history requirements, do not synthesize or infer missing change metadata. The response must reflect only persisted snapshot data. Logging may record the access attempt for audit purposes, but the operation itself must not create additional seller profile snapshots or alter the live seller profile.
 * @path /shoppingMall/seller/profile/snapshots/:snapshotId
 * @accessor api.functional.shoppingMall.seller.profile.snapshots.at
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
     * Target seller profile snapshot identifier
     */
    snapshotId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallSellerProfileSnapshot;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/seller/profile/snapshots/:snapshotId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/seller/profile/snapshots/${encodeURIComponent(props.snapshotId ?? "null")}`;
  export const random = (): IShoppingMallSellerProfileSnapshot =>
    typia.random<IShoppingMallSellerProfileSnapshot>();
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
      assert.param("snapshotId")(() => typia.assert(props.snapshotId));
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
