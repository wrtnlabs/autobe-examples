import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallWishlistEntry } from "../../../../structures/IPageIShoppingMallWishlistEntry";
import { IShoppingMallWishlistEntry } from "../../../../structures/IShoppingMallWishlistEntry";

/**
 * Create a new wishlist entry for the authenticated customer by saving a product for later consideration.
 *
 * This operation supports the personal saved-items flow described for WishlistEntry. A wishlist entry is a lightweight record of customer interest in a product and belongs only to the signed-in customer who creates it. The underlying record is stored in `shopping_mall_wishlist_entries`, which links one `shopping_mall_customers` account to one `shopping_mall_products` listing and records lifecycle timestamps such as `created_at`, `updated_at`, and `deleted_at`. The business meaning of this API is intentionally limited to remembering a product for future review rather than expressing a purchase commitment.
 *
 * Security for this operation is restricted to authenticated customers. Wishlist features are not available to guests, and the operation must execute in the context of the current customer account only. The caller cannot create wishlist entries on behalf of another customer, because ownership is derived from the authenticated `shopping_mall_customers` record rather than supplied by request data. This preserves the requirement that wishlist management is personal to the owning customer.
 *
 * The saved target is the product itself, not a variant, option combination, or SKU-level choice. This reflects the domain definition that WishlistEntry is product-based rather than variant-based. Even when a product has many purchasable versions, the entry in `shopping_mall_wishlist_entries` references only `shopping_mall_product_id`, and variant selection remains part of later cart and order flows. As a result, clients should use this endpoint after obtaining product information from product browsing APIs, then submit the selected product as a saved-interest action.
 *
 * This operation must also preserve the strict separation between wishlist behavior and cart or inventory behavior. Creating a wishlist entry does not create or update any cart item, does not reserve stock for any product variant, and does not affect pricing, checkout preparation, shipment intent, or order state. Stock changes for variants of the saved product do not transform the wishlist entry into a variant-specific record. The entry remains a saved product reference unless the customer removes it later or the product itself is deleted from the platform.
 *
 * Validation must enforce that the target product is a valid product resource and that the same authenticated customer does not create duplicate active wishlist entries for the same product. The `shopping_mall_wishlist_entries` table enforces a composite unique rule on customer and product ownership, and service logic should surface this as a meaningful business error rather than a raw persistence failure. Requests that attempt to treat a variant as the saved target are invalid because wishlist saving is defined only at the product level.
 *
 * This operation is commonly used together with wishlist browsing and removal operations. After successful creation, the customer should be able to retrieve the updated personal wishlist through list APIs, and later remove the saved product without affecting any cart contents. If the product is later deleted from the catalog, the wishlist lifecycle rules allow the saved item to disappear from active browsing results without exposing other customers' data.
 *
 * @param props.connection
 * @param props.body Product information to save in the authenticated customer's wishlist
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Implement a create-wishlist-entry service for
 *   authenticated customers.
 *
 * 1. Resolve the authenticated actor and require that the actor is a customer. Reject unauthenticated requests and any non-customer actor before performing database work.
 * 2. Parse the request body as `IShoppingMallWishlistEntry.ICreate`. The DTO should provide the target product identifier only; do not accept customer ownership from the client, and do not interpret any variant-level identifier as a valid wishlist target.
 * 3. Load the target row from `shopping_mall_products` by its primary key. Confirm that the product exists and is not in a deleted lifecycle state. Because `shopping_mall_products` includes `status` and `deleted_at`, reject products that are removed from active catalog usage according to platform policy. Do not join variant tables for creation because wishlist entries are product-level only.
 * 4. Check for an existing active row in `shopping_mall_wishlist_entries` where `shopping_mall_customer_id` equals the authenticated customer ID, `shopping_mall_product_id` equals the requested product ID, and `deleted_at` is null. If such a row exists, return a conflict-style business error indicating the product is already saved in the customer's wishlist.
 * 5. If a historical soft-deleted row for the same customer-product pair exists, restore it if the persistence strategy supports lifecycle restoration by setting `deleted_at` back to null and updating `updated_at`; otherwise create a fresh row while still preserving uniqueness guarantees. In either approach, ensure the final active state satisfies the composite unique constraint.
 * 6. Insert or restore the wishlist entry in a transaction-safe manner using the authenticated customer ID, the validated product ID, and current timestamps for `created_at` and `updated_at` as appropriate.
 * 7. Return the created resource as `IShoppingMallWishlistEntry`. The response payload should represent the wishlist entry resource and may be enriched by downstream schema composition, but implementation must remain grounded in the persisted `shopping_mall_wishlist_entries` record.
 *
 * Business rules to enforce:
 * - Wishlist creation is customer-owned and must never create entries for another user.
 * - Wishlist entries are product-based only; do not support variant-based saving.
 * - Creating a wishlist entry must not create or update any cart item.
 * - Creating a wishlist entry must not reserve or mutate stock.
 * - Duplicate active entries for the same customer-product pair are not allowed.
 *
 * Error handling expectations:
 * - 401/403 style failure for unauthenticated or unauthorized non-customer access.
 * - Not-found or invalid-target failure when the product does not exist or is not eligible for active wishlist saving.
 * - Conflict failure when the product is already present in the active wishlist.
 * - Validation failure when the client submits a variant-oriented target instead of a product-oriented target.
 *
 * Keep all writes limited to `shopping_mall_wishlist_entries`; no side effects should occur in cart, inventory, order, or payment tables.
 * @path /shoppingMall/customer/wishlistEntries
 * @accessor api.functional.shoppingMall.customer.wishlistEntries.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Product information to save in the authenticated customer's wishlist
     */
    body: IShoppingMallWishlistEntry.ICreate;
  };
  export type Body = IShoppingMallWishlistEntry.ICreate;
  export type Response = IShoppingMallWishlistEntry;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/customer/wishlistEntries",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/customer/wishlistEntries";
  export const random = (): IShoppingMallWishlistEntry =>
    typia.random<IShoppingMallWishlistEntry>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(),
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
 * Retrieve a filtered and paginated list of wishlist entries belonging to the signed-in customer.
 *
 * This operation exposes the customer's personal saved-products view backed by the shopping_mall_wishlist_entries table, which is described as product-level saved items that let a customer keep products for later consideration in a personal wishlist. Each active record links the authenticated customer account to a product listing and stores lightweight ownership and lifecycle information such as when the product was added to the wishlist and when the entry was last updated. The operation is intended for wishlist browsing and management screens where a customer wants to review products they have saved for later without expressing an immediate purchase commitment.
 *
 * Access is restricted to authenticated customers only. The requirements state that wishlist viewing, addition, and removal are not allowed without a signed-in customer identity, and all wishlist actions operate only within that customer's own saved products. For that reason, this endpoint must derive ownership from the authenticated customer session rather than from client-supplied customer identifiers. The service must never expose another customer's wishlist entries through this operation.
 *
 * The returned data represents product interest only, not variant selection. The requirements explicitly define WishlistEntry as product-based rather than variant-based, meaning a saved item refers to the overall product and not to a specific SKU, color, or size combination. If the customer later decides to purchase, variant selection belongs to the cart and order flow rather than this wishlist flow. Consistent with the schema comment that product details are resolved from related catalog tables at query time, the response should present wishlist entry summaries enriched with the associated product information needed for browsing while preserving the wishlist entry as the underlying business record.
 *
 * This operation must also preserve the separation between wishlist, cart, and stock management. A wishlist entry is only a saved-interest record and does not create or update any cart item, does not reserve stock for any product variant, and does not guarantee future availability. Filtering and sorting may help the customer browse saved items efficiently, such as by save date or related product characteristics, but the operation must not reinterpret the wishlist as a purchase-preparation or inventory-holding mechanism.
 *
 * Only active wishlist entries should be returned. The database schema includes a deleted_at lifecycle column for entries that have been removed from the active wishlist, so list results should exclude records whose deleted_at is set unless the business contract explicitly evolves to support historical recovery views. If a saved product has been deleted from the platform, the underlying wishlist record may no longer remain available as an active browsing item because the requirement states that a wishlist entry remains available until the customer removes it or the product is deleted from the platform.
 *
 * This endpoint is commonly used together with the wishlist creation and removal operations. Customers typically save a product first, then revisit this index operation to review their saved catalog interests later. When they are ready to buy, they should use cart-oriented operations to choose a specific variant and quantity rather than expecting this wishlist retrieval endpoint to produce a variant-specific or checkout-ready selection.
 *
 * @param props.connection
 * @param props.body Wishlist search, pagination, and sorting criteria
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Implement a customer-scoped wishlist search over
 *   shopping_mall_wishlist_entries.
 *
 * 1. Authenticate the caller as a customer. Reject requests from unauthenticated callers or non-customer actors before any database access intended for wishlist retrieval.
 * 2. Build the query from shopping_mall_wishlist_entries as the base table. Apply a mandatory ownership predicate using the authenticated customer's ID against shopping_mall_customer_id.
 * 3. Exclude inactive rows by requiring deleted_at to be null. This ensures the result contains only active wishlist items.
 * 4. Join the related product record from shopping_mall_products to materialize product-facing summary data required by the response DTO. If summary design requires additional storefront information, resolve it from related catalog tables through the product relationship, but keep the wishlist entry as the primary resource being listed.
 * 5. Support request-body-driven pagination, filtering, and sorting using IShoppingMallWishlistEntry.IRequest. At minimum, support pagination inputs and deterministic ordering. Default sort should prioritize recently saved entries, using created_at descending unless the request specifies another allowed order.
 * 6. Ensure filters remain compatible with the business meaning of wishlist entries. Do not accept variant-specific filters as if a wishlist entry were tied to a product variant. Product-level browsing criteria are acceptable; variant-choice semantics are not.
 * 7. Map each row to IShoppingMallWishlistEntry.ISummary or the corresponding summary shape embedded in IPageIShoppingMallWishlistEntry.ISummary. Include wishlist-entry lifecycle metadata appropriate for list display, especially the saved timestamp, together with resolved product summary information expected by the DTO design.
 * 8. Return a paginated response object of type IPageIShoppingMallWishlistEntry.ISummary.
 *
 * Validation and edge handling:
 * - If the caller is not signed in as a customer, reject the request as an invalid wishlist action.
 * - Never allow the client to choose a different customer scope in the request body.
 * - Do not create, update, or delete cart items as part of this read operation.
 * - Do not reserve stock or derive availability guarantees from wishlist presence.
 * - If joined product data is unavailable because the product was deleted, handle according to DTO contract and active-record policy; the operation should not surface invalid cross-entity state as a normal active wishlist item.
 * - Use stable pagination semantics so repeated browsing requests do not produce inconsistent ordering for equal sort keys.
 * @path /shoppingMall/customer/wishlistEntries
 * @accessor api.functional.shoppingMall.customer.wishlistEntries.index
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
     * Wishlist search, pagination, and sorting criteria
     */
    body: IShoppingMallWishlistEntry.IRequest;
  };
  export type Body = IShoppingMallWishlistEntry.IRequest;
  export type Response = IPageIShoppingMallWishlistEntry.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/customer/wishlistEntries",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/customer/wishlistEntries";
  export const random = (): IPageIShoppingMallWishlistEntry.ISummary =>
    typia.random<IPageIShoppingMallWishlistEntry.ISummary>();
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
 * Retrieve one saved wishlist entry from the signed-in customer's personal wishlist.
 *
 * This operation returns the detail representation of a product-level saved item recorded in the shopping_mall_wishlist_entries table. A wishlist entry is a lightweight customer-product pairing that captures saved interest for later consideration, not a purchase commitment. In line with the domain definition, the entry refers to the overall product from shopping_mall_products rather than to a specific product variant, option combination, or SKU. The operation is therefore intended to let a customer inspect a previously saved product reference within the customer's own wishlist management flow.
 *
 * Access to this operation is restricted to an authenticated customer. The requirements explicitly state that wishlist viewing is not available without a signed-in customer identity, and wishlist management is personal to the owning customer. For that reason, the server must verify not only that the caller is authenticated as a customer, but also that the requested wishlist entry belongs to that same customer account. If the identifier does not exist, has been removed from the active wishlist lifecycle, or belongs to a different customer, the operation must not disclose the record.
 *
 * The underlying persistence model stores only ownership and lifecycle metadata on shopping_mall_wishlist_entries, including the owner customer reference, the saved product reference, and created_at, updated_at, and deleted_at timestamps. Product details such as name, description, current base price, seller ownership, category linkage, and listing status are sourced from shopping_mall_products. This aligns with the schema comments that wishlist browsing remains normalized and product details are resolved from related catalog tables at query time. Because the product record includes lifecycle state and deletion tracking, the implementation should ensure the returned representation reflects only an active and valid saved-product relationship.
 *
 * This operation is closely related to the customer's wishlist list and removal flows. A customer would commonly retrieve the wishlist collection first, then request a specific entry by identifier when a more focused view is needed in the client. The record remains distinct from cart behavior: a wishlist entry preserves future interest in a product, while any later purchase decision, quantity choice, or variant selection belongs to cart and order workflows rather than to the wishlist itself.
 *
 * Expected error handling must cover unauthenticated access, attempts to access another customer's wishlist entry, and requests for entries that do not exist or are no longer active. The response should never imply that a product variant was saved, because the business rules state that wishlist saving is product-only. The endpoint should therefore document and preserve the distinction between saved interest and active purchasing intent.
 *
 * @param props.connection
 * @param props.wishlistEntryId Target wishlist entry ID owned by the signed-in customer
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Authenticate the caller as a customer and obtain the
 *   authenticated customer account identifier.
 *
 * Query shopping_mall_wishlist_entries by id with a predicate that also matches shopping_mall_customer_id to the authenticated customer and filters for deleted_at IS NULL. Join or subsequently load the related shopping_mall_products record referenced by shopping_mall_product_id so the response DTO can be materialized with current product information resolved from the catalog side.
 *
 * If no active wishlist entry matches both the requested id and the authenticated customer, return a not-found style failure without revealing whether the record exists for another customer. If the related product is absent from active listings or has been logically removed from the active catalog lifecycle, treat the wishlist entry as unavailable for retrieval according to the business rule that saved entries are not retained as active wishlist items when the referenced product no longer exists.
 *
 * Map the result to IShoppingMallWishlistEntry. The DTO should represent a product-level wishlist entry only and must not introduce variant-specific semantics. Include lifecycle and relationship data that are actually defined by the schema and needed by the generated DTO, using shopping_mall_wishlist_entries as the source of ownership and timestamp fields and shopping_mall_products as the source of current product-facing details.
 *
 * Do not permit seller, administrator, or guest access through this operation. Do not mutate wishlist state, cart state, product state, or inventory as part of this retrieval. The operation is read-only and should execute without a write transaction unless the platform's infrastructure requires standard read wrappers.
 * @path /shoppingMall/customer/wishlistEntries/:wishlistEntryId
 * @accessor api.functional.shoppingMall.customer.wishlistEntries.at
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
     * Target wishlist entry ID owned by the signed-in customer
     */
    wishlistEntryId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallWishlistEntry;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/customer/wishlistEntries/:wishlistEntryId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/customer/wishlistEntries/${encodeURIComponent(props.wishlistEntryId ?? "null")}`;
  export const random = (): IShoppingMallWishlistEntry =>
    typia.random<IShoppingMallWishlistEntry>();
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
      assert.param("wishlistEntryId")(() =>
        typia.assert(props.wishlistEntryId),
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

/**
 * Permanently remove one saved product entry from the signed-in customer's personal wishlist.
 *
 * This operation deletes a single record from the wishlist entry collection that links one customer account to one product listing for later consideration. The underlying wishlist table, shopping_mall_wishlist_entries, is a product-level saved-items structure that stores ownership through shopping_mall_customer_id, references the saved catalog record through shopping_mall_product_id, and tracks lifecycle timestamps such as created_at, updated_at, and deleted_at. In business terms, removing a wishlist entry means the saved product no longer appears in that customer's wishlist unless the customer saves the same product again later.
 *
 * Access to this operation is restricted to an authenticated customer because wishlist features are available only to signed-in customers. The request must be evaluated in the context of the current customer account represented by shopping_mall_customers, and the system must ensure that the targeted wishlist entry belongs to that customer before allowing removal. The operation must not be usable as a cross-account deletion mechanism, and any attempt to remove a wishlist entry outside the authenticated customer's own wishlist must be rejected.
 *
 * The removal affects only the customer's wishlist state. It does not modify shopping cart contents, does not alter any current or historical orders, and does not change product records in shopping_mall_products beyond the fact that the product is no longer linked from this customer's active wishlist. This is consistent with the business rule that wishlist entries represent products rather than variants, so deletion here removes only the saved product association and does not imply anything about variant selection or purchase configuration.
 *
 * This operation should work correctly with paginated wishlist browsing. After deletion, subsequent wishlist listing requests must reflect the updated set of active wishlist entries for the same customer and continue to produce valid paginated results even when the removed item changes the last available page. Consumers typically use the wishlist list operation before and after this endpoint to render the current saved-products view.
 *
 * If the wishlist entry does not exist, has already been removed from active use, or does not belong to the signed-in customer, the request must fail rather than silently affecting another record. The operation should treat the wishlist entry as an active customer-owned resource and remove it in a way consistent with the table's lifecycle tracking fields.
 *
 * @param props.connection
 * @param props.wishlistEntryId Target wishlist entry ID.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Resolve the authenticated customer from the session
 *   context and reject the request when no signed-in customer identity is
 *   present.
 *
 * Load the target record from shopping_mall_wishlist_entries by id = {wishlistEntryId}. The lookup must confirm that deleted_at is null so only active wishlist entries are eligible for removal. If no active record exists for the provided id, return a not-found style error.
 *
 * Verify ownership by comparing shopping_mall_wishlist_entries.shopping_mall_customer_id with the authenticated shopping_mall_customers.id. If they do not match, reject the request as forbidden or not found according to the platform's security policy, but do not remove the record.
 *
 * Remove the wishlist entry from the customer's active wishlist. Because shopping_mall_wishlist_entries includes deleted_at and the schema describes soft lifecycle tracking for removals, the implementation should perform a lifecycle-safe removal by setting deleted_at to the current timestamp and updating updated_at, rather than physically deleting the row, unless the platform's persistence layer centrally translates erase semantics differently. The removed record must no longer appear in active wishlist queries.
 *
 * Do not modify cart data, orders, order history, or product rows in shopping_mall_products. This operation only changes the active lifecycle state of the single wishlist entry record.
 *
 * After the update, return success with no response body. Downstream list queries for the same customer must exclude records whose deleted_at is not null so pagination remains valid after removal.
 *
 * Edge cases: reject unauthenticated callers; reject removal of another customer's wishlist entry; reject already-removed entries as non-active targets; keep behavior idempotency-safe from the consumer perspective by never affecting more than one row identified by the primary key.
 * @path /shoppingMall/customer/wishlistEntries/:wishlistEntryId
 * @accessor api.functional.shoppingMall.customer.wishlistEntries.erase
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function erase(
  connection: IConnection,
  props: erase.Props,
): Promise<void> {
  return true === connection.simulate
    ? erase.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...erase.METADATA,
          path: erase.path(props),
          status: null,
        },
      );
}
export namespace erase {
  export type Props = {
    /**
     * Target wishlist entry ID.
     */
    wishlistEntryId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/customer/wishlistEntries/:wishlistEntryId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/customer/wishlistEntries/${encodeURIComponent(props.wishlistEntryId ?? "null")}`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: erase.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: erase.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("wishlistEntryId")(() =>
        typia.assert(props.wishlistEntryId),
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
