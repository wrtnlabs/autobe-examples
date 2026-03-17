import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallSellerProfile } from "../../../structures/IPageIShoppingMallSellerProfile";
import { IShoppingMallSellerProfile } from "../../../structures/IShoppingMallSellerProfile";

/**
 * Retrieve a filtered and paginated list of seller storefront profiles.
 *
 * This operation returns seller-facing public shop identity records, not seller authentication accounts. In the business domain, SellerProfile is explicitly separated from SellerAccount because the profile represents the shop information customers see, while the account represents marketplace membership, sign-in, and approval concerns. The collection returned by this operation is therefore intended for browsing current public shop presentation such as shop name, shop description, and logo image, which together form the seller's storefront identity.
 *
 * The endpoint is designed for collection browsing rather than profile maintenance. Seller profile maintenance is a separate seller-owned capability that updates the current public profile state for future customer viewing. By contrast, this operation supports discovery, filtering, sorting, and pagination across multiple seller profiles so that marketplace users can find shops efficiently. In line with list browsing expectations, the request body is used to express richer search criteria and ordering rules than a simple query string would reasonably support.
 *
 * Security and data-boundary behavior are intentionally constrained. This operation must expose only public seller-profile information and must not disclose SellerAccount credentials, approval internals, or other non-profile actor data. If authorization is applied, it should allow only actors permitted to browse marketplace shop identities, such as customers viewing stores, sellers reviewing storefront information, and administrators performing platform oversight. The operation should never blur the separation between shop presentation and account authentication established in the requirements.
 *
 * From a data-model perspective, the response represents current seller profile state only. Historical purchase-time seller identity belongs to SellerProfilePurchaseSnapshot, and preserved historical profile changes belong to seller profile snapshot records; those historical artifacts are not the purpose of this endpoint. Clients that need a specific seller profile for detailed display may use a corresponding single-resource retrieval operation after locating the target profile in this paginated result set.
 *
 * Validation and behavior should follow standard browsing expectations. Unsupported filter fields must be rejected, pagination inputs must be validated, and the operation should return a stable paginated result ordered according to the requested or default sort rules. Error handling must leave underlying seller profile data unchanged because this endpoint is read-oriented and does not perform profile modification.
 *
 * @param props.connection
 * @param props.body Seller profile search, filter, sort, and pagination criteria
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement a seller-profile search service over the current seller profile table only.
 *
 * Accept an IShoppingMallSellerProfile.IRequest body containing pagination, filter, and sort criteria. Validate page size, page cursor or page number strategy defined by the shared paging convention, and reject unsupported filter or sort fields. Treat the operation as read-only and do not mutate seller profile state under any circumstance.
 *
 * Build a query rooted in shopping_mall_seller_profiles and join to the owning seller record only when necessary for authorization or integrity checks, never to expose seller credential data. Select only profile-facing fields needed for IShoppingMallSellerProfile.ISummary, such as current shop presentation attributes. Do not include password, session, approval-token, or other account-security fields from seller-related actor tables.
 *
 * Apply filtering for supported storefront-discovery criteria, such as partial matching on shop name and other explicitly modeled public profile attributes. Apply deterministic sorting so pagination is stable across repeated requests. Return a paginated container mapped to IPageIShoppingMallSellerProfile.ISummary.
 *
 * If the platform requires authenticated access for seller-profile browsing, verify the caller identity before query execution and reject unauthorized access. Administrators may use the same operation for oversight, but the response shape remains profile-oriented rather than governance-oriented.
 *
 * When validation fails, return the appropriate error without partial success semantics. When no records match, return an empty page result rather than an error. Historical seller profile snapshots and purchase-time seller profile snapshot data are out of scope for this endpoint and must not be substituted for the current public profile collection.
 * @path /shoppingMall/seller-profiles
 * @accessor api.functional.shoppingMall.seller_profiles.index
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
     * Seller profile search, filter, sort, and pagination criteria
     */
    body: IShoppingMallSellerProfile.IRequest;
  };
  export type Body = IShoppingMallSellerProfile.IRequest;
  export type Response = IPageIShoppingMallSellerProfile.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/seller-profiles",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/seller-profiles";
  export const random = (): IPageIShoppingMallSellerProfile.ISummary =>
    typia.random<IPageIShoppingMallSellerProfile.ISummary>();
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
 * Retrieve the current public seller shop profile identified by the given seller profile ID.
 *
 * This operation returns the active storefront identity record stored in the shopping_mall_seller_profiles table. That table is defined as the public storefront identity for a seller account and stores the active shop-facing profile shown to customers, including the shop name, shop description, and logo reference. In line with the business requirements, the returned resource represents the seller’s latest current public shop profile rather than any historical profile version. The response therefore reflects the most recent saved profile information that customers see when they open a seller profile from the marketplace.
 *
 * Access to this operation is intended for marketplace actors who need to read the current seller-facing shop identity. Customers may use it to view a seller’s public profile, sellers may use it to inspect the current public version of their own shop profile, and administrators or super administrators may use it for oversight and support purposes. The implementation must still enforce record existence and active-state checks so that deleted or unavailable profiles are not exposed as current public content.
 *
 * The underlying shopping_mall_seller_profiles record is a dependent extension of shopping_mall_sellers and enforces exactly one profile per seller through a unique foreign key on shopping_mall_seller_id. The returned data should therefore be treated as the single current profile for the associated seller account. The most important consumer-visible fields are shop_name, which is displayed in storefronts, product listings, and seller profile pages; shop_description, which is the seller-provided public description shown on the seller profile page; and logo_uri, which is the URI of the shop logo image currently used for public seller branding. Metadata such as created_at and updated_at may also be returned to support auditing or client freshness handling.
 *
 * This operation is intentionally limited to the current profile state. Historical edits are preserved separately, as both the requirements and schema commentary distinguish the active current profile from historical profile versions and snapshots. Clients that need historical review must use the dedicated history-oriented APIs instead of this endpoint. Similarly, this operation does not expose seller credential or approval-management behavior from shopping_mall_sellers beyond what is necessary for internal access control and consistency checks.
 *
 * When the seller profile does not exist, has been removed from active use, or is otherwise not available as a current profile, the operation must fail without modifying any data. Because this is a read-only endpoint, it never updates seller profile content, seller account state, or related marketplace records. It should be used together with seller profile update operations when a seller needs to change storefront identity data, but this endpoint itself is only responsible for returning the current public representation.
 *
 * @param props.connection
 * @param props.sellerProfileId Target seller profile ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Load a single record from shopping_mall_seller_profiles by its primary key id using sellerProfileId.
 *
 * Filter the query to match the requested id and exclude records whose deleted_at is not null, because this endpoint is for the current active public seller profile only. If no matching active record exists, return a not-found error.
 *
 * Join or separately verify the related shopping_mall_sellers row through shopping_mall_seller_id only as needed for authorization or consistency checks. Do not expose seller credential fields such as email or password_hash in the response DTO. The response payload should map from the seller profile entity fields, especially id, shopping_mall_seller_id, shop_name, shop_description, logo_uri, created_at, and updated_at, according to the IShoppingMallSellerProfile schema.
 *
 * Authorize access according to public profile viewing and oversight rules: allow authenticated customers to read seller public shop profiles, allow the owning seller to read their own current profile, and allow administrator and super administrator actors for oversight. If actor-specific middleware already grants broader public-read behavior for seller profile pages, reuse that policy; otherwise enforce at minimum that unauthorized or unauthenticated access is rejected according to the platform’s active authorization design.
 *
 * Do not mutate shopping_mall_seller_profiles, shopping_mall_sellers, or any historical snapshot tables in this operation. Keep historical profile retrieval separate. Handle missing, deleted, or inaccessible records with explicit read errors and return no partial update behavior because this is a pure retrieval endpoint.
 * @path /shoppingMall/seller-profiles/:sellerProfileId
 * @accessor api.functional.shoppingMall.seller_profiles.at
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
     * Target seller profile ID
     */
    sellerProfileId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallSellerProfile;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/seller-profiles/:sellerProfileId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/seller-profiles/${encodeURIComponent(props.sellerProfileId ?? "null")}`;
  export const random = (): IShoppingMallSellerProfile =>
    typia.random<IShoppingMallSellerProfile>();
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
      assert.param("sellerProfileId")(() =>
        typia.assert(props.sellerProfileId),
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
