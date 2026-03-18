import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallOrderItem } from "../../../../api/structures/IPageIShoppingMallOrderItem";
import { IShoppingMallCartItem } from "../../../../api/structures/IShoppingMallCartItem";
import { IShoppingMallOrderItem } from "../../../../api/structures/IShoppingMallOrderItem";
import { CustomerAuth } from "../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../decorators/payload/CustomerPayload";
import { deleteShoppingMallCustomerItemsCartItemId } from "../../../../providers/deleteShoppingMallCustomerItemsCartItemId";
import { getShoppingMallCustomerItemsCartItemId } from "../../../../providers/getShoppingMallCustomerItemsCartItemId";
import { patchShoppingMallCustomerItems } from "../../../../providers/patchShoppingMallCustomerItems";
import { postShoppingMallCustomerItems } from "../../../../providers/postShoppingMallCustomerItems";
import { putShoppingMallCustomerItemsCartItemId } from "../../../../providers/putShoppingMallCustomerItemsCartItemId";

@Controller("/shoppingMall/customer/items")
export class ShoppingmallCustomerItemsController {
  /**
   * Create a new purchased order item record for a selected product variant and quantity.
   *
   * This operation records one transactional line item in the shopping mall order system. It is used when the platform needs to persist a committed purchase line that belongs to an order and points to a specific product variant. The stored record keeps the purchased quantity and the current item lifecycle state so that later shipment, cancellation, refund, and review workflows can operate on the same item-level history.
   *
   * The created item represents a single variant purchase, which aligns with the domain rule that repeated purchases of the same variant within one order should be represented as one combined order item with an increased quantity. The item also serves as the durable reference for fulfillment and after-sales processes, while preserved purchase-state details are handled by the dedicated snapshot tables in the data model.
   *
   * Only authenticated customer members should normally create order items through the storefront purchase flow, because the item belongs to a customer's order history and is part of the checkout-to-fulfillment lifecycle. Administrative access may be used for oversight tooling if the service exposes such internal use, but the endpoint itself is intended to create a customer purchase line rather than a catalog or inventory record.
   *
   * The server must validate that the referenced order exists, the selected product variant exists, and the requested quantity is valid for the purchase workflow. System-managed lifecycle fields such as shipped time, delivered time, cancelled time, refunded time, status transitions, creation timestamps, and update timestamps must be assigned by the application layer and not accepted from the client. If the variant is unavailable or the quantity cannot be accepted by the business rules, the request must fail before persisting the line item.
   *
   * @param connection
   * @param body Order item creation data including the target order, variant, and purchase quantity.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Implement this endpoint as a service-layer create flow for shopping_mall_order_items.
   *
   * 1. Validate the request body and authenticate the caller as an authorized customer-side actor for purchase creation.
   * 2. Resolve the parent order by its ID, ensure it belongs to the caller when the operation is used in a customer checkout context, and ensure the order is in a state that still allows item creation.
   * 3. Resolve the target shopping_mall_product_variant and verify that the variant exists, is not deleted, and can be purchased according to the current stock and item-state business rules.
   * 4. Enforce quantity rules: quantity must be a positive integer, and the final order-line quantity should represent the combined purchased units for the chosen variant. If the same variant already exists in the order within the same transactional context, the application should merge the quantity rather than creating a duplicate item record.
   * 5. Create the shopping_mall_order_items row inside a transaction together with any necessary downstream inventory or order-state side effects. The live schema includes shopping_mall_order_id, shopping_mall_product_variant_id, quantity, status, shipped_at, delivered_at, cancelled_at, refunded_at, created_at, updated_at, and deleted_at. Initialize status to the committed paid state and leave the lifecycle timestamps null until the corresponding workflow updates occur.
   * 6. Do not accept client input for shipped_at, delivered_at, cancelled_at, refunded_at, created_at, updated_at, or deleted_at; these are system-controlled fields.
   * 7. Return the newly created order-item entity after persistence. If the application layer performs order status recalculation, do it after the item insert within the same transaction so order history remains consistent.
   * 8. Handle common failures with clear business errors: order not found, variant not found, invalid quantity, variant unavailable, order not eligible for item creation, or quantity merge conflicts when the same variant is being processed concurrently.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IShoppingMallOrderItem.ICreate,
  ): Promise<IShoppingMallOrderItem> {
    try {
      return await postShoppingMallCustomerItems({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a filtered and paginated list of order items.
   *
   * This endpoint returns purchased product-variant line items from the shopping mall order domain, including the item-level fulfillment state, purchased quantity, and the timestamps that describe how the line moved through shipping, delivery, cancellation, or refund workflows. It is designed for browsing many records at once, not for editing a single item, and it follows the platform rule that each order item keeps its own lifecycle history independently of the overall order.
   *
   * The response is intended for customers reviewing their purchase history, sellers reviewing fulfillment work for their own products, and administrators performing platform oversight. Because the order item table is indexed by order, product variant, status, and creation time, this endpoint should support status-based filtering, time-based sorting, and pagination so large order histories can be searched efficiently.
   *
   * The returned list must preserve the business meaning of each line item: quantity represents the number of units covered by that item, status reflects the item-level state only, and shipped, delivered, cancelled, and refunded timestamps must be treated as the authoritative lifecycle markers for the line. Related order, shipment, and snapshot data may be used by downstream detail views, but this endpoint should remain focused on searchable item summaries.
   *
   * When used by a customer, the service must restrict results to items belonging to that customer’s orders. When used by a seller, the service must restrict results to order items for that seller’s products. When used by an administrator, the service may return all order items subject to the requested filters and paging rules. If a client needs a single item’s full detail, it should call the corresponding item detail endpoint rather than expanding this list response.
   *
   * @param connection
   * @param body Search, filtering, sorting, and pagination criteria for order items.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Implement a paginated order-item search query over shopping_mall_order_items with optional joins to shopping_mall_orders and shopping_mall_shipments for context filtering.
   *
   * Use a request-body driven query because clients need flexible filtering and sorting across multiple criteria. Support filtering by item status, parent order identifier or order number, seller scope through shipment or product-variant ownership, shipment presence, created date range, and pagination controls. The query should default to newest-first ordering by created_at, consistent with list browsing expectations.
   *
   * Enforce access control at the service layer: customers may only see items belonging to their own orders; sellers may only see items for products they own; administrators may see all items. Apply these scope constraints before returning results, and reject any attempt to query unauthorized records. Preserve the item-level semantics from the domain rules: do not derive item status from the overall order status, and do not collapse multiple item states into a single order state.
   *
   * Project the result as a compact summary DTO suitable for list rendering. Include the order item id, parent order reference, purchased quantity, item status, shipped_at, delivered_at, cancelled_at, refunded_at, created_at, and minimal parent context needed for browsing. If needed, join the related order for order number and placement time, and join the product variant relationship only for seller/customer-facing display fields that are part of the summary schema. Avoid loading snapshot tables here because snapshots are for historical detail and dispute review, not for list search.
   *
   * Use the existing indexes on status and created_at to keep the query efficient. If the request includes invalid status values, negative pagination values, or an unsupported sort field, return validation errors before querying the database. For empty result sets, return an empty page with correct pagination metadata.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IShoppingMallOrderItem.IRequest,
  ): Promise<IPageIShoppingMallOrderItem.ISummary> {
    try {
      return await patchShoppingMallCustomerItems({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single cart item owned by the authenticated customer.
   *
   * This operation returns the complete cart-item record used in the shopping cart workflow, including the selected product variant, the quantity currently stored in the cart, and the pricing information needed to render the cart line and prepare checkout. In the shopping mall domain, a cart item represents one specific product-variant entry inside a customer's active cart, so the response is intended for cart detail screens and cart validation before purchase.
   *
   * The cart item is part of the customer's private shopping state, so access must be limited to the owning customer, with administrative access only if the platform's authorization layer explicitly allows support or oversight access. If the requested cart item does not belong to the authenticated principal, the server must deny the request. If the cart item exists but the underlying product variant has changed or become unavailable, the operation should still return the stored cart item data so the client can present the current cart state accurately.
   *
   * @param connection
   * @param cartItemId Target cart item ID.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Load the cart item by cart_item_id and verify ownership against the authenticated customer.
   *
   * Perform a primary lookup on shopping_mall_cart_items using the path identifier. Join or hydrate the related product variant context from shopping_mall_product_variants and shopping_mall_products as needed for the response payload, but do not recalculate business totals beyond the stored cart-item state unless the underlying cart rules require current pricing display. Enforce that the cart item belongs to the authenticated customer through the parent cart relationship before returning the record.
   *
   * If the item is missing, return a not-found response. If ownership fails, return forbidden. If the item references a variant that is unavailable or deleted, keep the cart item readable and surface the related availability state through the response DTO so the client can warn the user. No transaction is required because this is a read-only detail operation.
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
      return await getShoppingMallCustomerItemsCartItemId({
        customer,
        cartItemId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the quantity of a single cart item in the customer's active cart.
   *
   * This endpoint modifies one stored cart line in the shopping basket that belongs to the authenticated customer. The cart item is the normalized child record that connects the owning cart with a selected product variant, and it stores the intended purchase quantity for that variant. The request does not reselect the cart or variant; it only updates the editable quantity on the existing item identified by `cartItemId`.
   *
   * The service must confirm that the target cart item belongs to the current customer's cart before applying any change. It must also verify that the selected product variant still exists and is available for shopping, because cart item rows are only meaningful when the linked variant is still valid. Quantity changes should preserve the one-variant-per-line rule enforced by the cart model, so the implementation must update the existing row rather than create a duplicate row for the same variant.
   *
   * If the requested quantity is invalid, missing, or conflicts with the current variant availability, the endpoint must reject the update and keep the cart unchanged. The response returns the updated cart item so the client can redraw the cart immediately after a successful edit.
   *
   * @param connection
   * @param cartItemId Target cart item ID.
   * @param body New quantity for the existing cart item.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Load the cart item by cartItemId with its owning cart and linked product variant. Confirm the cart belongs to the authenticated customer; otherwise return a not-found or forbidden-style error without revealing ownership details. Reject the request if the cart item is deleted.
   *
   * Validate the incoming quantity in the request body as a positive integer. If the quantity is zero, negative, or exceeds business limits, return a validation error. If the linked variant is unavailable for purchase, reject the update. If the business layer enforces stock-aware cart limits, compare the requested quantity against the variant's current sellable quantity and return an error or warning according to service rules.
   *
   * Apply the quantity update in a single transaction and persist the updated timestamp. Do not modify the cart identity, variant identity, or any product fields. Do not create a new cart item row because the schema already enforces one row per cart-variant combination through a unique constraint. After saving, return the refreshed cart item record for the client to update cart totals on the frontend.
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
      return await putShoppingMallCustomerItemsCartItemId({
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
   * Remove an item from the authenticated customer’s shopping cart.
   *
   * This operation deletes a single cart line identified by the cart item ID. It is used when a customer decides that a specific product variant should no longer remain in the active cart before checkout. The cart item concept represents one variant entry inside a cart, including its quantity and subtotal meaning, so removing it changes the cart contents immediately and may affect the cart total shown to the customer.
   *
   * Only the owning customer may perform this action. The server must verify that the cart item belongs to the current authenticated customer and is part of that customer’s active cart before removing it. If the item does not exist or does not belong to the caller, the request must be rejected. This endpoint does not modify products, variants, stock history, or order history; it only removes the selected cart entry from the current basket.
   *
   * This operation is commonly used together with cart retrieval and cart update operations. After successful deletion, clients should refresh the cart state so that item totals and the overall cart total reflect the reduced contents.
   *
   * @param connection
   * @param cartItemId Target cart item ID.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Implement a cart-item deletion service that deletes one shopping cart line by cartItemId.
   *
   * Lookup the cart item by its primary identifier and ensure it belongs to the current authenticated customer’s cart. If the record does not exist, or the cart is not owned by the caller, return a not-found or forbidden-style error according to the project’s error handling policy. The operation must not accept a request body.
   *
   * Perform the delete in a transaction if the cart total is recalculated in the same flow. After removing the cart item, recalculate the parent cart’s totals and any summary fields used by the cart view so the UI receives an up-to-date cart state. Do not touch inventory records, product records, or order records.
   *
   * If the cart becomes empty after deletion, keep the cart record available unless another business rule explicitly requires cleanup. Return the deleted cart item representation or the updated resource representation expected by the cart API pattern in this codebase. Ensure authorization is limited to the customer actor, since carts are customer-owned data.
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
      return await deleteShoppingMallCustomerItemsCartItemId({
        customer,
        cartItemId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
