import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallCartItem } from "../../../../api/structures/IPageIShoppingMallCartItem";
import { IShoppingMallCartItem } from "../../../../api/structures/IShoppingMallCartItem";
import { CustomerAuth } from "../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../decorators/payload/CustomerPayload";
import { deleteShoppingMallCustomerCartItemsCartItemId } from "../../../../providers/deleteShoppingMallCustomerCartItemsCartItemId";
import { getShoppingMallCustomerCartItemsCartItemId } from "../../../../providers/getShoppingMallCustomerCartItemsCartItemId";
import { patchShoppingMallCustomerCartItems } from "../../../../providers/patchShoppingMallCustomerCartItems";
import { postShoppingMallCustomerCartItems } from "../../../../providers/postShoppingMallCustomerCartItems";
import { putShoppingMallCustomerCartItemsCartItemId } from "../../../../providers/putShoppingMallCustomerCartItemsCartItemId";

@Controller("/shoppingMall/customer/cartItems")
export class ShoppingmallCustomerCartitemsController {
  /**
   * Add a product variant to the authenticated customer's shopping cart.
   *
   * This operation creates a new cart entry in the `shopping_mall_cart_items` table, linking the authenticated customer to a specific product variant (`shopping_mall_product_variants`) with the desired purchase quantity. Each cart item represents a concrete purchase intent — unlike a wishlist item which tracks interest at the product level, a cart item is always bound to a specific variant (e.g., a particular color and size combination).
   *
   * The `shopping_mall_cart_items` table enforces a unique constraint on `(customer_id, product_variant_id)`, meaning that each variant can appear at most once per customer's cart. If the customer already has the target variant in their cart, the system consolidates quantities rather than creating a duplicate entry — the existing cart item's quantity is incremented by the amount specified in the request body. For example, if the cart already contains 2 units of a variant and the customer adds 3 more, the resulting cart item will have a quantity of 5.
   *
   * The system automatically determines the `availability_status` of the cart item at the time of creation by evaluating the current state of the referenced variant: 'available' if the variant is active and has positive stock, 'out_of_stock' if the variant exists but stock is zero, or 'variant_deleted' if the variant has been removed by the seller. Attempting to add a non-existent variant returns an error.
   *
   * The quantity provided in the request body must be a positive integer (minimum 1). There is no concept of a cart item with zero or negative quantity — such values are rejected with a validation error.
   *
   * Only authenticated customers can call this endpoint. The customer identity is derived from the current session; no customer ID is required in the request. The cart is personal to each customer and isolated from other customers' carts.
   *
   * Related operations: Use `PATCH /shoppingMall/customer/cartItems` to view the full cart contents. Use `PUT /shoppingMall/customer/cartItems/{cartItemId}` to update the quantity of an existing cart item. Use `DELETE /shoppingMall/customer/cartItems/{cartItemId}` to remove a specific cart item. When an order is successfully placed, all cart items included in that order are automatically removed.
   *
   * @param connection
   * @param body The product variant to add to the cart and the desired quantity. If the variant is already in the cart, the quantity is added to the existing amount.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification 1. Authenticate the customer from the current session. Return 401 if not authenticated.
   * 2. Validate the request body:
   *    - `product_variant_id` must be a valid UUID and must reference an existing `shopping_mall_product_variants` record (regardless of `deleted_at` status, to allow showing unavailable states; however if the variant does not exist at all, return 404).
   *    - `quantity` must be a positive integer (≥ 1). Return 422 if zero or negative.
   * 3. Determine the current availability status of the variant:
   *    - If `deleted_at` is NOT null → 'variant_deleted'
   *    - Else if current stock (sum of all `shopping_mall_inventory_records.delta` for this variant) equals zero → 'out_of_stock'
   *    - Else → 'available'
   * 4. Check for an existing cart item with the same `(customer_id, product_variant_id)` pair using the unique index `@@unique([customer_id, product_variant_id])`:
   *    a. If EXISTS: Update the existing record — set `quantity = existing_quantity + requested_quantity`, update `availability_status` to the freshly computed value, and set `updated_at = NOW()`. Return the updated cart item.
   *    b. If NOT EXISTS: Insert a new `shopping_mall_cart_items` record with a fresh UUID `id`, the authenticated customer's `customer_id`, the provided `product_variant_id`, the provided `quantity`, the computed `availability_status`, and `created_at = updated_at = NOW()`. Return the newly created cart item.
   * 5. The entire upsert operation (check + insert/update) must be performed within a single database transaction to avoid race conditions.
   * 6. Return the resulting cart item record (whether created or updated) as the response body.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IShoppingMallCartItem.ICreate,
  ): Promise<IShoppingMallCartItem> {
    try {
      return await postShoppingMallCustomerCartItems({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a paginated, filtered list of cart items belonging to the currently authenticated customer.
   *
   * This operation queries the `shopping_mall_cart_items` table, which represents pre-checkout entries linking a customer to a specific product variant with a desired purchase quantity. Each cart item is always bound to a concrete product variant — the customer must have previously selected a specific combination of options (such as color and size) before an item can enter the cart. The unique constraint `@@unique([customer_id, product_variant_id])` guarantees that each variant appears at most once in a given customer's cart.
   *
   * The response includes comprehensive variant and product information for each cart item: the variant's SKU code, effective price (derived from `price_override` if set, otherwise the parent product's `base_price`), option key-value pairs (e.g., color, size), product name, and product description. A computed subtotal (effective price × quantity) is also included per line item.
   *
   * The `availability_status` field on each cart item reflects the current purchasability of the referenced variant. Possible values are `'available'` (variant is purchasable), `'out_of_stock'` (variant exists but has zero inventory), and `'variant_deleted'` (the seller has removed the variant). Items with non-available statuses remain visible in the cart so the customer is aware of what has changed, but they cannot be included in a checkout. Customers may filter the cart list by availability status to see only available items or to identify items that need attention.
   *
   * This endpoint is exclusively accessible to authenticated customers. The result set is automatically scoped to the requesting customer's own cart items — no other customer's data is ever exposed. Pagination is supported via the request body, allowing the customer to page through large carts with configurable page sizes.
   *
   * Related operations: Use `POST /cartItems` to add a new variant to the cart, `PUT /cartItems/{cartItemId}` to update the quantity of an existing item, and `DELETE /cartItems/{cartItemId}` to remove an item from the cart.
   *
   * @param connection
   * @param body Search criteria, availability filter, pagination, and sorting options for the customer's cart item list
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Query the shopping_mall_cart_items table filtered by the authenticated customer's ID (from session/JWT). Apply optional availability_status filter from the request body. Join with shopping_mall_product_variants to get variant details (sku, price_override, deleted_at), and further join with shopping_mall_products to get product name, description, base_price. Join with shopping_mall_product_variant_options for the option key-value pairs defining each variant's configuration. Derive the effective price per item: use price_override if set, otherwise use the parent product's base_price. Calculate subtotal = effective_price * quantity for each cart item. Apply pagination (page, limit) from the request body. Sort by created_at descending by default, or by the sort criteria in the request body. Return a paginated result set. The availability_status values are: 'available', 'out_of_stock', 'variant_deleted'. Edge cases: if a customer has no cart items, return an empty page. Ensure only the authenticated customer can see their own cart items — never expose other customers' carts.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IShoppingMallCartItem.IRequest,
  ): Promise<IPageIShoppingMallCartItem.ISummary> {
    try {
      return await patchShoppingMallCustomerCartItems({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single shopping cart item by its unique identifier.
   *
   * This operation returns the full detail of a specific cart entry belonging to the authenticated customer. A CartItem (stored in the `shopping_mall_cart_items` table) represents a concrete product variant that the customer has selected and placed in the cart prior to checkout. Each CartItem is bound to exactly one product variant — identified by the customer's option selections such as color and size — and records the desired purchase quantity.
   *
   * The response includes the product name, the selected variant's option values, the effective unit price for that variant (which may come from the variant's `price_override` or fall back to the product's base price when `price_override` is null), the quantity held in the cart, the computed subtotal (unit price × quantity), and the current availability status of the variant.
   *
   * The `availability_status` field on the `shopping_mall_cart_items` record reflects the current purchasability of the referenced variant. Possible values are `available` (the variant is purchasable), `out_of_stock` (the variant exists but has no remaining inventory as derived from `shopping_mall_inventory_records`), and `variant_deleted` (the seller has removed the variant). Items with non-available statuses are clearly flagged in the response so the client UI can distinguish them from purchasable items and alert the customer.
   *
   * A stock warning is included when the current available stock for the variant is less than the quantity currently recorded in the cart, alerting the customer that the full requested quantity may not be fulfillable.
   *
   * Access is strictly restricted to the customer who owns the cart item. Each customer's cart is private — no other customer, seller, or administrator can view or manipulate another customer's cart items. Any attempt by a non-owning actor to access this resource will be rejected by the authorization layer.
   *
   * @param connection
   * @param cartItemId The unique identifier (UUID) of the cart item to retrieve. Must belong to the authenticated customer.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification 1. Authenticate the request as a customer actor.
   * 2. Look up the shopping_mall_cart_items record by the provided cartItemId (UUID primary key).
   * 3. Verify that the record's customer_id matches the authenticated customer's ID. If not, return 403 Forbidden.
   * 4. If no record exists for the given cartItemId, return 404 Not Found.
   * 5. Join with shopping_mall_product_variants to retrieve sku, price_override, deleted_at, and join with shopping_mall_products to get the product name and base_price.
   * 6. Join with shopping_mall_product_variant_options to retrieve the option key-value pairs describing the variant configuration.
   * 7. Compute the effective unit price: use price_override if it is non-null, otherwise use the product's base_price.
   * 8. Compute the subtotal: effective_unit_price × quantity.
   * 9. Compute current stock level: SUM of delta values from shopping_mall_inventory_records where product_variant_id matches.
   * 10. Determine stock warning: set to true if current stock > 0 AND current stock < cart item quantity.
   * 11. Reflect the availability_status from the cart item record (available, out_of_stock, variant_deleted).
   * 12. Return the assembled IShoppingMallCartItem response including all product, variant, pricing, quantity, subtotal, availability, and stock-warning information.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":cartItemId")
  public async at(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("cartItemId")
    cartItemId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallCartItem> {
    try {
      return await getShoppingMallCustomerCartItemsCartItemId({
        customer,
        cartItemId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the quantity of a specific item in the authenticated customer's shopping cart.
   *
   * This operation allows a customer to change the desired purchase quantity for an existing cart line item, identified by its unique cart item ID. The cart item corresponds to a record in the `shopping_mall_cart_items` table, which links a customer to a specific product variant (`shopping_mall_product_variants`) with a desired purchase quantity.
   *
   * Only the `quantity` field may be changed through this operation. The product variant associated with the cart item cannot be changed — doing so would require removing the existing cart item and adding a new one. The `availability_status` field is managed entirely by the system and reflects whether the variant is currently purchasable ('available'), has no inventory ('out_of_stock'), or has been removed by the seller ('variant_deleted'); it cannot be set by the customer.
   *
   * The provided quantity must be a positive integer of at least 1. Attempting to set the quantity to zero or a negative value is not permitted — to remove an item from the cart entirely, the customer must use the dedicated DELETE endpoint (`DELETE /shoppingMall/customer/cartItems/{cartItemId}`). After a successful update, the system recalculates the subtotal for the cart line item and adjusts the cart total accordingly.
   *
   * If the new quantity exceeds the available inventory for the referenced variant, the system still accepts the update but reflects the stock constraint in the returned `availability_status` field, alerting the customer that the requested quantity may not be fully fulfilled at checkout.
   *
   * This operation is restricted to the authenticated customer who owns the cart item. Attempting to update a cart item belonging to a different customer results in a not-found or authorization error. The updated cart item — including the new quantity and any recalculated availability status — is returned in the response.
   *
   * Related operations:
   * - `POST /shoppingMall/customer/cartItems` — Add a new variant to the cart (creates a cart item or consolidates quantity if variant already present).
   * - `DELETE /shoppingMall/customer/cartItems/{cartItemId}` — Remove a cart item from the cart entirely.
   * - `PATCH /shoppingMall/customer/cartItems` — List all cart items for the current customer.
   *
   * @param connection
   * @param cartItemId The unique identifier (UUID) of the cart item to update. Must belong to the authenticated customer.
   * @param body New quantity to set for the cart item. Must be a positive integer of at least 1.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification 1. Authenticate the requesting customer from the JWT session.
   * 2. Look up the shopping_mall_cart_items record by cartItemId (UUID). Verify that the record exists and that its customer_id matches the authenticated customer's ID. If not found or not owned by the customer, return 404.
   * 3. Validate the incoming quantity from the request body: must be an integer >= 1. If quantity is 0 or negative, return a 422 validation error instructing the client to use DELETE to remove the item.
   * 4. Within a database transaction:
   *    a. Update the shopping_mall_cart_items.quantity field to the new value.
   *    b. Check the current available stock for the referenced product_variant_id by summing inventory records. If the new quantity exceeds available stock, set availability_status to 'out_of_stock'; if the variant is deleted, set to 'variant_deleted'; otherwise set to 'available'.
   *    c. Update shopping_mall_cart_items.updated_at to the current timestamp.
   * 5. Commit the transaction and return the full updated shopping_mall_cart_items record, joined with the product variant and related product information for the response DTO.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":cartItemId")
  public async update(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("cartItemId")
    cartItemId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallCartItem.IUpdate,
  ): Promise<IShoppingMallCartItem> {
    try {
      return await putShoppingMallCustomerCartItemsCartItemId({
        customer,
        cartItemId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Remove a specific item from the authenticated customer's shopping cart.
   *
   * This operation permanently deletes the targeted cart item record, identified by its unique UUID, from the customer's cart. Once removed, the item no longer appears in the cart and the cart total is recalculated accordingly to reflect the remaining items.
   *
   * Customers are permitted to remove both available and unavailable cart items. This is particularly useful for clearing items whose underlying variant has become out-of-stock (`availability_status: 'out_of_stock'`) or has been deleted by the seller (`availability_status: 'variant_deleted'`), so that customers can clean up their cart before proceeding to checkout.
   *
   * The `shopping_mall_cart_items` table stores cart entries that bind a specific customer to a particular product variant with a desired purchase quantity. Each cart item is uniquely identified by a UUID primary key (`id`) and belongs to exactly one customer (`customer_id`). A customer may only remove cart items that belong to themselves; attempts to remove another customer's cart item must be rejected.
   *
   * This operation is irreversible. Once a cart item is deleted, the customer must re-add the variant to their cart if they wish to purchase it. Cart items that were already converted to an order upon successful checkout are automatically removed by the system and do not need to be manually deleted through this endpoint.
   *
   * Related operations:
   * - `POST /cartItems` — Add a new item to the cart.
   * - `PUT /cartItems/{cartItemId}` — Update the quantity of an existing cart item.
   * - `PATCH /cartItems` — List and browse all cart items for the authenticated customer.
   *
   * @param connection
   * @param cartItemId The unique identifier (UUID) of the cart item to be removed.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification 1. Authenticate the request and extract the current customer's identity from the session/JWT token.
   * 2. Query the `shopping_mall_cart_items` table to find the record where `id = cartItemId`.
   * 3. Verify that the found cart item's `customer_id` matches the authenticated customer's ID. If not found or not owned by the customer, return a 404 Not Found error.
   * 4. Permanently delete the cart item row from the `shopping_mall_cart_items` table using the primary key.
   * 5. Return HTTP 204 No Content on success (no response body).
   *
   * Edge cases:
   * - If `cartItemId` does not exist in the database, return 404 Not Found.
   * - If the cart item exists but belongs to a different customer, return 404 Not Found (avoid leaking existence of other customers' data).
   * - Both 'available' and 'out_of_stock' and 'variant_deleted' availability statuses are all valid for deletion — do not block removal based on availability_status.
   * - No cascade or side effects on other tables are required; the cart item record is simply removed.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":cartItemId")
  public async erase(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("cartItemId")
    cartItemId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteShoppingMallCustomerCartItemsCartItemId({
        customer,
        cartItemId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
