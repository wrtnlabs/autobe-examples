import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallCartItem } from "../../../../structures/IPageIShoppingMallCartItem";
import { IShoppingMallCartItem } from "../../../../structures/IShoppingMallCartItem";

/**
 * Add a selected product variant to the authenticated customer's shopping cart.
 *
 * This operation creates or refreshes a variant-level basket line in the customer's active cart. In the underlying shopping_mall_cart_items table, each record represents one selected product variant in one customer's cart before order creation, storing the requested quantity together with cart-time unit pricing and current checkout availability context. The operation follows the business requirement that a customer must select a specific purchasable variant rather than a product in general. A product alone is not enough to create a cart item; the request must identify the concrete variant the customer intends to buy.
 *
 * The operation is available only to the authenticated customer who owns the cart. Cart items belong to one customer account and represent active purchase intent until the customer changes the quantity, removes the item, or completes checkout. The system must never create duplicate active lines for the same customer and variant combination because the shopping_mall_cart_items table enforces uniqueness on shopping_mall_customer_id and shopping_mall_product_variant_id. When the same variant is added again, the system combines the new quantity with the existing cart line instead of inserting a separate duplicate row.
 *
 * This operation depends on live catalog state from shopping_mall_product_variants and shopping_mall_products. The selected variant is the canonical purchasable unit, identified by its seller-managed SKU code and option_summary, and it belongs to a parent product. The product provides the current merchandise identity and base_price, while the variant may optionally override the selling price through its price column. During processing, the service must verify that the variant exists, is not deleted, belongs to the referenced product, and is still eligible for cart placement according to current listing and stock rules. The unit_price captured in the cart line should reflect the current effective selling price derived from variant price override or the parent product base price.
 *
 * The returned cart item reflects current authoritative cart state, including the requested quantity, the captured unit price used for the cart line, and the availability flag that indicates whether the line is currently eligible for checkout based on live variant existence and stock eligibility. If the customer had previously removed the same variant and the implementation preserves the record using deleted_at, the operation should restore that cart line back into the active cart instead of creating conflicting duplicates. Any attempt to add an invalid, deleted, mismatched, or unavailable variant must be rejected so that downstream cart review and checkout behavior remain consistent with current catalog reality.
 *
 * Clients commonly use this operation together with the cart viewing operation for reviewing all current cart lines and totals. After adding an item, the customer may call the cart listing endpoint to see all lines, product names, selected variant options, prices, quantities, subtotals, and the overall total in a consolidated cart view.
 *
 * @param props.connection
 * @param props.body Variant selection and quantity to add to the cart
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Authenticate the caller as a customer and resolve the caller's shopping_mall_customers.id as the cart owner. Accept a request body of type IShoppingMallCartItem.ICreate containing the target product identifier, target product variant identifier, and requested quantity.
 *
 * Validate the request in this order:
 * 1. Ensure quantity is a positive integer greater than zero.
 * 2. Load the referenced shopping_mall_product_variants row by shopping_mall_product_variant_id, including its parent shopping_mall_products row.
 * 3. Reject when the variant does not exist, has deleted_at set, or its parent product does not exist.
 * 4. Reject when the provided product identifier does not match shopping_mall_product_variants.shopping_mall_product_id.
 * 5. Reject when the parent product has deleted_at set or its status indicates it is not currently eligible for active cart placement.
 * 6. Determine the effective unit price as shopping_mall_product_variants.price when non-null, otherwise shopping_mall_products.base_price.
 * 7. Determine current availability using live variant existence and stock eligibility rules. If live checks say the item cannot currently be placed in cart, reject the request rather than creating an unusable new line.
 *
 * Upsert cart state using the unique key on [shopping_mall_customer_id, shopping_mall_product_variant_id]:
 * - If no row exists, create a new shopping_mall_cart_items record with a new UUID, the authenticated customer's ID, the validated product ID, the validated variant ID, the requested quantity, the effective unit price, computed availability, created_at, updated_at, and deleted_at as null.
 * - If an active row exists, increase its quantity by the requested quantity, refresh shopping_mall_product_id, unit_price, availability, and updated_at.
 * - If a matching row exists but is currently removed with deleted_at set, restore it by setting deleted_at to null, replacing or recomputing quantity according to add-to-cart semantics by combining the incoming quantity with the stored quantity if retained as active intent, and refreshing unit_price, availability, and updated_at.
 *
 * Perform the create or update in a transaction so the read-check-write sequence remains consistent under concurrent add-to-cart requests. Return the resulting cart item entity after persistence.
 *
 * Error handling:
 * - Return not found or validation failure when the product or variant does not exist.
 * - Return validation failure when the variant does not belong to the supplied product.
 * - Return forbidden when the caller is not an authenticated customer.
 * - Return conflict or validation failure when the current catalog state makes the variant unavailable for cart placement.
 * - Never allow the caller to specify or override shopping_mall_customer_id directly; ownership always comes from the authenticated session.
 * @path /shoppingMall/customer/cartItems
 * @accessor api.functional.shoppingMall.customer.cartItems.create
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
     * Variant selection and quantity to add to the cart
     */
    body: IShoppingMallCartItem.ICreate;
  };
  export type Body = IShoppingMallCartItem.ICreate;
  export type Response = IShoppingMallCartItem;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/customer/cartItems",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/customer/cartItems";
  export const random = (): IShoppingMallCartItem =>
    typia.random<IShoppingMallCartItem>();
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
 * Retrieve the authenticated customer's current cart items for pre-checkout browsing and cart management.
 *
 * This operation provides the signed-in customer with a collection view of the variant-level basket lines stored before order creation. It is designed around the cart behavior defined in the requirements: the cart must show all current cart lines, including the product name, the selected variant options, the applicable price, the quantity, and the subtotal for each line, while also supporting the overall browsing flow that precedes quantity adjustment, item removal, and checkout. Because cart contents are customer-owned shopping data, the operation is scoped to the authenticated customer and does not expose another customer's cart.
 *
 * The underlying resource corresponds to the `shopping_mall_cart_items` entity, described as variant-level basket lines in a customer's shopping cart before order creation. The returned summaries should be assembled together with related catalog data needed for display, especially the associated product and variant context required to present a meaningful cart line. The business rule that the platform shall maintain at most one cart line for the same variant within a customer's cart is important to this operation: the list is expected to show one consolidated line per distinct variant rather than duplicated entries for repeated additions.
 *
 * Security for this operation is ownership-based. Only the customer actor should access this endpoint for self-service cart review. The authenticated customer identity determines the cart scope automatically, so the client does not provide a customer identifier in the path or request body. This prevents cross-customer data access and keeps the interface consistent with customer-owned cart behavior.
 *
 * This operation is commonly used before subsequent cart actions such as changing quantity, removing a cart line, or proceeding to checkout. Clients typically call this endpoint to render the latest cart state, then invoke separate modification endpoints for quantity changes or removal, and then call this endpoint again to refresh the calculated line subtotals and current list state. The response type is documented as a paginated collection to remain consistent with the collection-search pattern used for PATCH-based index operations, even when most customer carts are relatively small.
 *
 * Expected failures include unauthenticated access, attempts to use the endpoint from an actor outside the customer role, and invalid request-body filtering or pagination values. The operation should never return cart lines belonging to a different customer, and any search or sort behavior must remain constrained to the authenticated customer's own cart records.
 *
 * @param props.connection
 * @param props.body Cart item list query criteria, pagination, and sorting options
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Implement this operation as a customer-scoped cart-item list query.
 *
 * 1. Authenticate the caller and require the `customer` actor. Resolve the customer account identifier from the authenticated session context rather than from request parameters.
 * 2. Parse `IShoppingMallCartItem.IRequest` for pagination, sorting, and any allowed search filters. Ignore or reject any criterion that attempts to override customer ownership scope.
 * 3. Query the `shopping_mall_cart_items` records belonging only to the authenticated customer. The query must enforce the business invariant that each variant appears as at most one cart line for that customer; if legacy duplicate data is encountered, the implementation should either normalize it before returning results or fail according to internal data-integrity policy rather than exposing duplicate lines.
 * 4. Join or load the related product and product variant data necessary to produce the cart display described in requirements, including product name, selected variant options, applicable price, quantity, and computed subtotal for each returned line. If summary DTO construction requires additional related records, load only the relations necessary for the response contract.
 * 5. Compute each line subtotal as the applicable unit price multiplied by the cart quantity. Also compute the current aggregate cart total across all matched cart lines if that aggregate is part of the summary/page contract for `IPageIShoppingMallCartItem.ISummary`.
 * 6. Apply deterministic sorting and pagination after ownership filtering. Return the paginated result in the `IPageIShoppingMallCartItem.ISummary` shape.
 * 7. Handle edge cases explicitly: unauthenticated caller -> authorization error; authenticated non-customer actor -> forbidden; invalid pagination or sort inputs -> validation error; missing related catalog records for an existing cart item -> treat as data inconsistency and handle under service error policy.
 *
 * This operation is read-only and must not mutate quantities, merge lines, or remove items during execution. Any recalculation performed here is limited to response shaping from current persisted cart-item state and related catalog data.
 * @path /shoppingMall/customer/cartItems
 * @accessor api.functional.shoppingMall.customer.cartItems.index
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
     * Cart item list query criteria, pagination, and sorting options
     */
    body: IShoppingMallCartItem.IRequest;
  };
  export type Body = IShoppingMallCartItem.IRequest;
  export type Response = IPageIShoppingMallCartItem.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/customer/cartItems",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/customer/cartItems";
  export const random = (): IPageIShoppingMallCartItem.ISummary =>
    typia.random<IPageIShoppingMallCartItem.ISummary>();
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
 * Retrieve one current cart line for the authenticated customer by cart item identifier.
 *
 * This operation returns the detail of a single shopping basket line from the customer's active cart before order creation. In the domain model, a cart item represents one pre-checkout purchase-intent line that always refers to a specific purchasable variant rather than a product in general. The underlying shopping_mall_cart_items record stores the owner customer reference, the referenced live product, the selected product variant, the requested quantity, the cart-time unit price, the current availability flag, and lifecycle timestamps. Consistent with the cart viewing requirement, the response is intended to support cart review screens that show the current product context, the selected variant option combination, the applicable price used for the cart line, the quantity, and the line subtotal derived from unit_price multiplied by quantity.
 *
 * Access to this operation is restricted to an authenticated customer acting within that customer's own account context. The cart is a customer-owned shopping activity, and the platform's access model is centered on signed-in customer identity rather than guest behavior. The service must verify that the requested cart line belongs to the current customer by matching shopping_mall_cart_items.shopping_mall_customer_id against the authenticated customer account. If the cart item does not belong to the current customer, the request must be rejected and no information about another customer's basket may be disclosed.
 *
 * This operation is related to the live catalog entities referenced by the cart line. The shopping_mall_products table provides the current product listing context, including the product name, seller-provided description, current base price, and listing status. The shopping_mall_product_variants table provides the specific variant identity through sku_code, option_summary, and an optional variant-level price override. Because the cart item stores its own unit_price, the response should present the price captured for the cart line while also using the related product and variant records to describe what the customer selected. The availability flag should reflect whether the selected variant is currently eligible for checkout based on live variant existence and stock eligibility.
 *
 * This endpoint is commonly used together with the broader cart viewing operation that lists all current cart lines and the create, update, or removal operations that manage cart contents. Customers typically reach this detail after adding a specific variant to the cart or when reviewing one line for quantity changes or validation before checkout. If the cart item has already been removed from the active cart, indicated by deleted_at being set, the operation should treat it as unavailable for active-cart retrieval rather than exposing it as a normal current cart entry.
 *
 * Expected error handling must cover missing authentication, ownership mismatch, and missing or inactive cart items. When the identifier does not match an existing active cart line owned by the authenticated customer, the service should return an appropriate not-found style outcome for the caller's accessible scope. Validation of cart totals across all lines is outside this operation's scope; this endpoint returns one cart item and its line-level detail only.
 *
 * @param props.connection
 * @param props.cartItemId Target cart item's UUID owned by the authenticated customer
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Implement a read-only service method that retrieves one active cart item for the authenticated customer.
 *
 * 1. Authenticate the caller as a customer and obtain the current customer account ID. Reject requests that do not have an active customer authentication context.
 * 2. Query shopping_mall_cart_items by id = :cartItemId, shopping_mall_customer_id = :currentCustomerId, and deleted_at IS NULL. This ownership-scoped lookup is mandatory so the API never exposes another customer's basket line.
 * 3. Join or separately load the related shopping_mall_products row through shopping_mall_product_id and the related shopping_mall_product_variants row through shopping_mall_product_variant_id. Use these relations to populate product and variant descriptive fields needed by the response DTO.
 * 4. If no matching active cart item exists in the authenticated customer's scope, return a not-found error. Do not reveal whether the identifier exists for another customer.
 * 5. Build the response from the cart row plus related product and variant data. Map quantity from shopping_mall_cart_items.quantity, unit price from shopping_mall_cart_items.unit_price, checkout availability from shopping_mall_cart_items.availability, product identity from shopping_mall_products.id and name, and variant identity from shopping_mall_product_variants.id, sku_code, and option_summary.
 * 6. Compute the line subtotal as unit_price * quantity at response assembly time if the DTO includes subtotal, because the cart schema explicitly keeps derived values out of storage.
 * 7. Preserve cart-time pricing semantics by using shopping_mall_cart_items.unit_price as the authoritative price for this cart line display rather than recalculating from shopping_mall_products.base_price or shopping_mall_product_variants.price. Related product and variant prices may be used only as contextual information if needed by downstream DTO mapping.
 * 8. If the related product or variant has become unavailable or changed since the cart line was created, still return the cart line when it remains active for the owner, using the availability field to reflect current checkout eligibility. If referential data is unexpectedly missing despite foreign keys, treat it as an internal consistency failure.
 * 9. Return the assembled IShoppingMallCartItem JSON object. No mutation, transaction write, or audit record creation is required for this read operation.
 * @path /shoppingMall/customer/cartItems/:cartItemId
 * @accessor api.functional.shoppingMall.customer.cartItems.at
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
     * Target cart item's UUID owned by the authenticated customer
     */
    cartItemId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallCartItem;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/customer/cartItems/:cartItemId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/customer/cartItems/${encodeURIComponent(props.cartItemId ?? "null")}`;
  export const random = (): IShoppingMallCartItem =>
    typia.random<IShoppingMallCartItem>();
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
      assert.param("cartItemId")(() => typia.assert(props.cartItemId));
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
 * Update an existing cart item in the authenticated customer's shopping basket.
 *
 * This operation modifies one record in the cart item store that represents a variant-level basket line in a customer's shopping cart before order creation. The underlying cart item record belongs to exactly one customer account and references both the live product and the selected product variant, while storing the requested purchase quantity, the per-unit price captured for the cart line, and whether the line is currently available for checkout based on live variant existence and stock eligibility. In business terms, a cart item expresses active purchase intent for a specific purchasable variant rather than for a product in general.
 *
 * The primary customer-facing use of this endpoint is quantity management for an already existing cart line. The requirements state that customers can change the quantity of an existing cart item without removing the item from the cart, and that the cart must then update the cart line subtotal and the overall cart total to reflect the new quantity. Although subtotal and total are derived values and are not stored directly in the shopping_mall_cart_items table, the updated response should reflect the current cart line state after the quantity change and refreshed pricing or availability checks have been applied.
 *
 * Security for this operation is ownership-based. A cart item belongs to one customer account, and only the authenticated customer who owns the cart line may update it. The service must resolve the target cart item by cartItemId, verify that its shopping_mall_customer_id matches the authenticated customer, and reject any attempt to modify another customer's cart data. This endpoint is not part of seller product management or administrator oversight workflows; it exists exclusively for customer cart maintenance before checkout.
 *
 * This operation is closely related to the cart listing and cart removal workflows. A customer will typically use the cart listing operation to review current cart lines, including product name, selected variant options, applicable price, quantity, and line subtotal, and then invoke this endpoint to change a quantity for one line. If the customer no longer wants the line at all, the cart removal operation should be used instead of setting arbitrary invalid values. This endpoint does not create duplicate cart lines and does not move the item to a different variant; it updates the existing line identified by the cart item resource path.
 *
 * Validation must follow the business rules for cart eligibility and cart consolidation. The system must require a valid quantity for the selected variant, reject invalid or non-meaningful update values, and preserve the invariant that a customer has at most one cart line for the same variant. It must also re-evaluate live variant and product state using the referenced shopping_mall_product_variants and shopping_mall_products records, refresh the effective unit price from the variant-specific price or the parent product base price as appropriate, and refresh the availability flag based on current checkout eligibility. If the cart item does not exist, does not belong to the authenticated customer, references a no-longer-usable product or variant, or the requested quantity is not acceptable, the operation must fail without partially updating the record.
 *
 * @param props.connection
 * @param props.cartItemId Target cart item's ID
 * @param props.body Updated quantity and mutable cart line information
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Load the target shopping_mall_cart_items row by id = {cartItemId} and deleted_at IS NULL.
 *
 * Authorize by authenticated customer context. Verify the loaded cart item's shopping_mall_customer_id matches the authenticated customer's account id. If the cart item is missing, return a not-found error. If the cart item belongs to a different customer, return a forbidden error.
 *
 * Validate the request body according to IShoppingMallCartItem.IUpdate. At minimum, enforce that the updated quantity is present when quantity updates are supported and that it is a positive integer. Do not allow the request body to redefine ownership or resource identity fields already determined by the path and stored row.
 *
 * Load the referenced shopping_mall_product_variants row using shopping_mall_product_variant_id and confirm it is active enough for continued cart use, including checking deleted_at. Load the referenced shopping_mall_products row using shopping_mall_product_id and confirm the product is still usable for cart retention according to current listing state, including checking deleted_at and status rules enforced by the service.
 *
 * Recompute cart-time commercial context before persisting. Determine the effective unit price from shopping_mall_product_variants.price when it is not null; otherwise use shopping_mall_products.base_price. Re-evaluate availability from live product and variant state plus stock eligibility rules implemented by the domain service. Update shopping_mall_cart_items.quantity, unit_price, availability, and updated_at in a single write. Do not create a new cart row.
 *
 * Preserve the one-line-per-variant invariant for the customer. Because the target row already exists and is identified by cartItemId, this operation should update only that row. If future update payloads permit changing the variant reference, the service must first check the unique constraint on [shopping_mall_customer_id, shopping_mall_product_variant_id] and merge rather than duplicate; otherwise reject or consolidate according to business rules. In the current design, treat the operation as quantity-focused maintenance of the existing variant-specific line.
 *
 * Return the refreshed cart item resource after the update. The response should reflect the persisted quantity, effective unit price, availability, and timestamps. Derived cart totals are calculated by cart-view logic and are not stored in shopping_mall_cart_items, so they should not be written here unless included by the DTO layer as computed projections.
 *
 * Execute the read-check-update flow transactionally enough to avoid stale writes or inconsistent pricing context when concurrent cart updates occur.
 * @path /shoppingMall/customer/cartItems/:cartItemId
 * @accessor api.functional.shoppingMall.customer.cartItems.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /**
     * Target cart item's ID
     */
    cartItemId: string & tags.Format<"uuid">;

    /**
     * Updated quantity and mutable cart line information
     */
    body: IShoppingMallCartItem.IUpdate;
  };
  export type Body = IShoppingMallCartItem.IUpdate;
  export type Response = IShoppingMallCartItem;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/customer/cartItems/:cartItemId",
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
    `/shoppingMall/customer/cartItems/${encodeURIComponent(props.cartItemId ?? "null")}`;
  export const random = (): IShoppingMallCartItem =>
    typia.random<IShoppingMallCartItem>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("cartItemId")(() => typia.assert(props.cartItemId));
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
 * Permanently remove a single cart item from the signed-in customer's shopping cart.
 *
 * This operation deletes one active basket line represented by the cart item resource. In the domain model, a CartItem belongs to a CustomerAccount and references both a Product and a ProductVariant, allowing the customer to keep a specific purchasable variant in the cart before an order is created. Deleting the cart item removes only that pre-order selection from the customer's active shopping state and does not affect product catalog data, seller-owned inventory definitions, completed orders, order history, or any preserved purchase-time snapshots.
 *
 * This endpoint is intended for the customer actor only. Because cart contents are private customer-owned shopping data, the implementation must ensure that the requested cart item belongs to the authenticated customer before removal is allowed. A customer must never be able to remove another customer's cart item by guessing or supplying a different identifier. Seller, administrator, and super administrator roles do not use this endpoint for cart management in the normal business workflow.
 *
 * The operation is closely related to cart browsing and cart maintenance APIs. Clients typically call the cart listing operation before this endpoint to present current basket lines, and may call the listing operation again after deletion to refresh totals and visible cart contents. This delete action is independent from wishlist management: removing a cart item does not remove any wishlist entry for the same product, just as wishlist removal does not change cart contents. It is also independent from order history, because cart items exist only before checkout and do not represent preserved commercial transaction records.
 *
 * Expected behavior is simple and strict. If the cart item exists and belongs to the signed-in customer, the system removes it from active use and returns success without a response payload. If the cart item does not exist, or if it belongs to another customer, the system must reject the request. The implementation should treat ownership validation as mandatory before deletion and should avoid exposing whether another customer's cart item exists through permissive behavior or cross-account access.
 *
 * @param props.connection
 * @param props.cartItemId Identifier of the cart item to remove from the signed-in customer's cart
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Authenticate the caller as a customer session before executing the operation.
 *
 * Load the target record from the cart item persistence model by cartItemId. Verify that the record exists and that its owning customer account matches the authenticated customer. If no record is found, return a not-found error. If the record exists but belongs to a different customer, return a forbidden error or an equivalent ownership violation response according to platform conventions.
 *
 * When ownership validation succeeds, delete the cart item record in a single transaction-safe step. No cascading changes are required to wishlist entries, products, product variants, inventory records, orders, payment attempts, or historical snapshots, because cart items are isolated pre-order shopping state. After deletion, return successful completion with no response body.
 *
 * Implementation should ensure idempotent-visible behavior from the client's perspective only through standard error handling rules: a repeated request after deletion should no longer find the record. Record removal must not alter product listing visibility, shipment state, review state, or order preservation behavior. Logging and audit behavior may follow platform standards, but no additional business side effects are required for this operation.
 * @path /shoppingMall/customer/cartItems/:cartItemId
 * @accessor api.functional.shoppingMall.customer.cartItems.erase
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
     * Identifier of the cart item to remove from the signed-in customer's cart
     */
    cartItemId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/customer/cartItems/:cartItemId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/customer/cartItems/${encodeURIComponent(props.cartItemId ?? "null")}`;
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
      assert.param("cartItemId")(() => typia.assert(props.cartItemId));
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
