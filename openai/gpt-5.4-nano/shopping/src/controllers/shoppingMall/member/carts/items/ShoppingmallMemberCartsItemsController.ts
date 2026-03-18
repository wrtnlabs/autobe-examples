import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallCartItem } from "../../../../../api/structures/IShoppingMallCartItem";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { deleteShoppingMallMemberCartsCartIdItemsCartItemId } from "../../../../../providers/deleteShoppingMallMemberCartsCartIdItemsCartItemId";
import { getShoppingMallMemberCartsCartIdItemsCartItemId } from "../../../../../providers/getShoppingMallMemberCartsCartIdItemsCartItemId";
import { patchShoppingMallMemberCartsCartIdItems } from "../../../../../providers/patchShoppingMallMemberCartsCartIdItems";
import { postShoppingMallMemberCartsCartIdItems } from "../../../../../providers/postShoppingMallMemberCartsCartIdItems";
import { putShoppingMallMemberCartsCartIdItemsCartItemId } from "../../../../../providers/putShoppingMallMemberCartsCartIdItemsCartItemId";

@Controller("/shoppingMall/member/carts/:cartId/items")
export class ShoppingmallMemberCartsItemsController {
  /**
   * Adds a new product variant line to the specified customer cart.
   *
   * This endpoint creates a single row in the cart items storage for the target cart, capturing the quantity and the derived line subtotal amount. The cart itself is owned by exactly one customer, and this API enforces that customer isolation by applying the operation only to the authenticated member’s own cart. If the requester is not authenticated or does not own the cart identified by `cartId`, the operation must be rejected.
   *
   * Each cart item row references exactly one product variant and stores the quantity the customer intends to purchase. The cart also maintains a boolean warning flag indicating whether any cart items currently exceed available inventory; after creating the line item, the service recalculates the cart-level inventory warning to keep cart state consistent.
   *
   * Validation and business rules:
   *
   * - The request must include the referenced product variant identifier and the desired quantity.
   * - Quantity must be a positive integer (and must be validated against domain constraints defined for cart item quantity semantics).
   * - The referenced product variant must be eligible for adding to carts (e.g., it must not be deleted/unavailable at the time of processing). If a variant is unavailable, the operation should be rejected or handled according to the cart error scenarios so that the cart remains consistent.
   * - After inserting the cart item, the service updates the cart subtotal/warning computations for the resulting cart content.
   *
   * This endpoint must not create any order records. Order creation occurs only after a successful checkout confirmation flow; therefore, creating a cart item is limited to cart state updates only.
   *
   * Related APIs that are typically used together:
   *
   * - Use `GET /carts/{cartId}` (or the equivalent cart view endpoint) to display current cart state.
   * - Use `PATCH /carts/{cartId}/items` (or a dedicated update endpoint) to change quantities of existing items.
   * - Use `DELETE /carts/{cartId}/items/{cartItemId}` (or an equivalent erase endpoint) to remove an item entirely.
   *
   * Expected errors include: unauthorized access, invalid cart id format, quantity validation failure, and referenced variant ineligibility.
   *
   *
   * @param connection
   * @param cartId Target cart identifier. The cart is owned by a single authenticated customer; this id scopes the operation to that customer.
   * @param body Payload to add a product variant line to the cart by specifying the referenced variant and the desired quantity.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps:
   *
   * 1) Authenticate requester as a member.
   * 2) Load shopping_mall_carts by id = cartId.
   *    - If the cart does not exist: return 404-like error.
   *    - If shopping_mall_carts.shopping_mall_member_id != authenticated member id: reject as unauthorized.
   * 3) Validate request payload:
   *    - quantity must be > 0.
   *    - Ensure shopping_mall_product_variants exists for productVariantId.
   *    - Ensure the variant is currently available for cart purchase per product/variant business rules.
   * 4) Create shopping_mall_cart_items row:
   *    - shopping_mall_cart_id = cartId
   *    - shopping_mall_product_variant_id = productVariantId
   *    - quantity = requested quantity
   *    - subtotal_amount = (variant current price) * quantity captured at insert time.
   *    - deleted_at must remain null on creation.
   *    - created_at/updated_at set by DB.
   * 5) Update cart warning flag:
   *    - Recompute whether any cart item quantities exceed inventory for their variants (implementation depends on inventory semantics in the service layer).
   *    - Set shopping_mall_carts.warning_inventory_insufficient accordingly.
   * 6) Return the created cart item (including id and stored fields).
   *
   * Transactionality:
   * - Use a transaction to ensure cart item insertion and cart warning recalculation are consistent.
   *
   * Edge cases:
   * - If product variant is unavailable, reject the request without inserting.
   * - If quantity is invalid, reject without side effects.
   * - Do not create any order or payment records.
   *
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("cartId")
    cartId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallCartItem.ICreate,
  ): Promise<IShoppingMallCartItem> {
    try {
      return await postShoppingMallMemberCartsCartIdItems({
        member,
        cartId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the selected items inside a specific shopping cart.
   *
   * This operation applies to a single cart identified by `cartId` and performs customer-driven quantity updates for the cart lines stored in `shopping_mall_cart_items`. The cart belongs to a specific member via `shopping_mall_carts.shopping_mall_member_id`, so this endpoint must always enforce ownership: only the authenticated customer who owns the referenced cart can modify its items.
   *
   * When quantities are updated, the system must also keep derived and state fields consistent. For each targeted cart item (referencing `shopping_mall_cart_items.shopping_mall_product_variant_id`), the system recalculates `shopping_mall_cart_items.subtotal_amount` from the variant price and the new `shopping_mall_cart_items.quantity`, and then re-evaluates whether inventory is sufficient. If requested quantity exceeds available inventory for a variant, the cart must be marked with `shopping_mall_carts.warning_inventory_insufficient = true`.
   *
   * If a variant becomes unavailable (for example, variant deleted or inventory becomes zero) after the cart item was created, the cart item must not disappear silently. Instead, the cart item must be converted into an unavailable state by setting `shopping_mall_cart_items.deleted_at` (so the system treats the line as removed from active use), ensuring the customer can still view a consistent cart without allowing checkout for those unavailable items.
   *
   * This endpoint is also responsible for preventing invalid updates that would create an inconsistent cart view. If the customer attempts to modify an item that is not part of their own cart, the system must reject the action and leave the other customer’s cart state unchanged. If the update would target an unavailable line, the operation must preserve consistency so the item remains non-purchasable.
   *
   * Related operations: customers typically call this after cart creation/selection and before checkout. For placing an order from cart items, use the order placement operation described in the order workflow; for reading cart state, use the cart retrieval operations (not defined in this endpoint specification).
   *
   * @param connection
   * @param cartId Target cart ID whose items are being updated. Scope is the authenticated customer that owns this cart.
   * @param body Quantity update request specifying which cart items to update within the target cart.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1) Authorization & scope validation
   * - Require authenticated member.
   * - Resolve `cartId` to `shopping_mall_carts` row.
   * - Verify `shopping_mall_carts.shopping_mall_member_id` matches the authenticated member.
   * - If cart not found or not owned, reject.
   *
   * 2) Parse request body (list of quantity updates)
   * - For each requested line, identify the corresponding `shopping_mall_cart_items` row by cart scope and item identifier.
   * - Ensure the cart item is not marked as removed: treat rows where `deleted_at IS NOT NULL` as unavailable/non-modifiable.
   *
   * 3) Inventory re-evaluation and subtotal recalculation
   * - For each targeted cart item:
   *   a) Load referenced `shopping_mall_product_variants` and the current available stock level for `shopping_mall_product_variant_id`.
   *   b) If variant is unavailable or stock is insufficient for the new quantity, set cart-level warning and mark the cart item as unavailable by setting `shopping_mall_cart_items.deleted_at = now()`.
   *   c) If variant is available:
   *      - Update `shopping_mall_cart_items.quantity`.
   *      - Update `shopping_mall_cart_items.subtotal_amount` from variant price * quantity.
   *
   * 4) Cart warning aggregation
   * - After processing all lines, set `shopping_mall_carts.warning_inventory_insufficient` to true if any targeted update resulted in insufficient quantity.
   * - If all targeted lines are available and quantities are within available stock, set it to false (or recompute based on entire cart if required by implementation contract).
   *
   * 5) Transactionality & consistency
   * - Execute updates within a single database transaction so cart warning and cart item states remain consistent.
   * - On any validation failure (e.g., unauthorized cart item, invalid quantity), rollback and return an error without partial updates.
   *
   * 6) Response mapping
   * - Return the updated cart item summaries (including updated quantities and warning state as defined by the response DTO).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async updateCartItems(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("cartId")
    cartId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallCartItem.IRequest,
  ): Promise<IShoppingMallCartItem.ISummary> {
    try {
      return await patchShoppingMallMemberCartsCartIdItems({
        member,
        cartId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a specific cart item line from a customer’s cart.
   *
   * This operation targets one row in the underlying cart line table, representing a chosen product variant and the customer-selected quantity. The line-level subtotal is returned as stored in the cart item record.
   *
   * Authorization and ownership checks are required: the system must ensure that the cart referenced by {cartId} belongs to the authenticated customer, and that the requested {cartItemId} is the cart item whose shopping_mall_cart_id matches the provided {cartId}. If either condition fails, the operation must not reveal other customers’ cart data.
   *
   * The cart concept is the customer’s temporary container used before checkout. Cart item access is intentionally scoped so customers can only view items inside their own cart; requirements specify that cart operations apply only to the cart belonging to the authenticated customer.
   *
   * Related behavior: during checkout, unavailable items must be blocked from order placement; this read endpoint simply exposes the current cart line content. If the system later marks a cart item as unavailable due to inventory/seller status changes, the client can rely on the cart item representation from this endpoint to reflect the current state.
   *
   * @param connection
   * @param cartId Target cart ID whose ownership is verified against the authenticated customer.
   * @param cartItemId Target cart item line ID within the given cart.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification 1) Parse path params: cartId (UUID), cartItemId (UUID).
   * 2) Authenticate request per platform middleware and derive authenticated member identity.
   * 3) Query shopping_mall_carts by id = cartId and shopping_mall_member_id = authenticated member id, and ensure cart.deleted_at is null (treat deleted carts as not found).
   * 4) Query shopping_mall_cart_items by id = cartItemId and shopping_mall_cart_id = cartId, and ensure cart item.deleted_at is null.
   * 5) If cart not found or cartItem not found for that cartId, return 404 (or equivalent not-found) without indicating whether the cartId exists for other owners.
   * 6) Map fields to IShoppingMallCartItem response DTO, including quantity and subtotal_amount.
   * 7) Do not mutate data; no transaction is required beyond consistent reads.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":cartItemId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("cartId")
    cartId: string & tags.Format<"uuid">,
    @TypedParam("cartItemId")
    cartItemId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallCartItem> {
    try {
      return await getShoppingMallMemberCartsCartIdItemsCartItemId({
        member,
        cartId,
        cartItemId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update a single cart line item inside the authenticated customer’s cart.
   *
   * This endpoint is designed for customers to change the quantity of a specific cart item. The underlying record corresponds to the shopping_mall_cart_items model, which stores the cart line’s quantity (shopping_mall_cart_items.quantity) and a captured line subtotal (shopping_mall_cart_items.subtotal_amount), along with timestamps (created_at, updated_at) and an optional deletion timestamp (deleted_at) used to treat the line as removed.
   *
   * Authorization and data isolation are critical: the cart (shopping_mall_carts) is owned by exactly one member (shopping_mall_carts.shopping_mall_member_id). The implementation must ensure the provided cartId maps to the authenticated member and that the provided cartItemId belongs to that same cart. If the cartItemId belongs to a different cart, the operation must be rejected so other customers’ cart state cannot be modified.
   *
   * Business validation focuses on checkout correctness. The cart item references a specific product variant (shopping_mall_cart_items.shopping_mall_product_variant_id). During update, the service must validate that the referenced variant is eligible for purchase at the time of update (e.g., variant enabled/active and not removed via shopping_mall_product_variants.deleted_at, and inventory availability derived from inventory records if required by system rules). This prevents customers from creating states that would later violate the requirement that unavailable items cannot be included in a placed order.
   *
   * The cart item update must not create or modify orders. Order creation happens only after a separate checkout/placement workflow succeeds; therefore, this endpoint must limit itself to persisting the cart item changes and updating the cart-level warning flag (shopping_mall_carts.warning_inventory_insufficient) when the cart’s inventory sufficiency changes.
   *
   * If the update request intends to remove the item, the implementation should apply shopping_mall_cart_items.deleted_at semantics (so the row is treated as removed from active cart contents) rather than attempting to create an order or leaving inconsistent quantities. The service must keep cart items consistent so that later checkout will correctly block unavailable items.
   *
   * Related operations that are typically used together with this endpoint:
   *
   * - Updating multiple items may be performed via cart-level operations in other endpoints; this endpoint targets one line.
   * - Placing an order is performed by checkout/placement operations defined elsewhere; this endpoint must not trigger order creation.
   * - Inventory sufficiency warnings depend on cart items’ quantities and the referenced variants’ availability; this endpoint must update shopping_mall_carts.warning_inventory_insufficient accordingly.
   *
   * Expected errors and behavior:
   *
   * - If the cart does not belong to the authenticated member, return an authorization/validation error without changing any data.
   * - If the cart item does not belong to the given cartId, return an error.
   * - If the requested quantity is invalid or violates purchasing eligibility rules, reject the update and keep the existing cart item state unchanged.
   * - If the cart or cart item is logically removed (shopping_mall_carts.deleted_at or shopping_mall_cart_items.deleted_at), reject or handle according to the service’s active-record policy.
   *
   * @param connection
   * @param cartId Target cart identifier. Must belong to the authenticated member (scope for authorization).
   * @param cartItemId Target cart item identifier. Must belong to the specified cartId to prevent cross-cart modification.
   * @param body Update payload for a single cart item. Includes the desired quantity or removal intent. Subtotal_amount is derived by the service from the referenced variant price at update time, and the implementation must validate purchasing eligibility and inventory availability before persisting.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement PUT handler for updating a single shopping_mall_cart_items row.
   *
   * 1) Input/context
   * - Extract cartId and cartItemId from path.
   * - Read authenticated member identity from request context (per global auth middleware).
   * - Parse request body using IShoppingMallCartItem.IUpdate.
   *
   * 2) Ownership and existence checks (transaction)
   * - Start a DB transaction.
   * - Load shopping_mall_carts by id = cartId.
   * - Verify shopping_mall_carts.shopping_mall_member_id matches the authenticated member. If not, abort.
   * - Load shopping_mall_cart_items by id = cartItemId AND shopping_mall_cart_id = cartId.
   * - Verify the cart and cart item are active according to deleted_at semantics (if shopping_mall_carts.deleted_at is set, reject; if shopping_mall_cart_items.deleted_at is set, reject or treat per active-record policy).
   *
   * 3) Variant eligibility and inventory validation
   * - Using shopping_mall_cart_items.shopping_mall_product_variant_id, load shopping_mall_product_variants.
   * - Validate the variant is enabled for purchasing: shopping_mall_product_variants.is_active must be true and shopping_mall_product_variants.deleted_at must be null.
   * - Determine whether requested quantity is purchasable.
   *   - If the system requires inventory-derived availability from shopping_mall_inventory_records, compute available_quantity for the latest relevant record(s) and ensure requested quantity does not exceed available_quantity.
   *   - If inventory is insufficient, either reject the update or persist it while setting cart-level warning_inventory_insufficient depending on business rules in 04-business-rules (the DTO likely signals intended behavior). Do not allow transitions that would later include unavailable items by default during order placement.
   *
   * 4) Persist update
   * - If request indicates quantity change:
   *   - Update shopping_mall_cart_items.quantity.
   *   - Recalculate subtotal_amount from the variant price at the time of computation (shopping_mall_product_variants.price) multiplied by quantity; store into shopping_mall_cart_items.subtotal_amount.
   *   - Update shopping_mall_cart_items.updated_at.
   * - If request indicates removal:
   *   - Set shopping_mall_cart_items.deleted_at = now() and update updated_at as appropriate.
   *
   * 5) Update cart warning flag
   * - After updating the cart item, compute whether any active cart item has a quantity exceeding inventory availability for its variant.
   * - Set shopping_mall_carts.warning_inventory_insufficient accordingly for shopping_mall_carts.id = cartId.
   *
   * 6) Response
   * - Return the updated cart item (including computed/updated fields as defined by IShoppingMallCartItem response schema).
   *
   * 7) Edge cases
   * - Ensure no order/payment/shipment side effects occur.
   * - If validation fails, rollback transaction and return an error; do not update subtotal_amount or warning flags.
   * - Avoid race conditions by performing inventory checks and updates inside the same transaction where feasible.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":cartItemId")
  public async updateCartItem(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("cartId")
    cartId: string & tags.Format<"uuid">,
    @TypedParam("cartItemId")
    cartItemId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallCartItem.IUpdate,
  ): Promise<IShoppingMallCartItem> {
    try {
      return await putShoppingMallMemberCartsCartIdItemsCartItemId({
        member,
        cartId,
        cartItemId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes a single cart line item from the specified customer cart view.
   *
   * This endpoint targets one row in `shopping_mall_cart_items` within the cart identified by `cartId`. Each cart line references a product variant (via the cart item’s variant reference), and the cart’s derived state (such as totals and inventory-warning indicators) must be recomputed from the remaining cart lines after this operation succeeds.
   *
   * Security and ownership rules are enforced before any state change: customers can only modify cart items in a cart that belongs to the authenticated member (`shopping_mall_carts` ownership scope). If the cart does not belong to the authenticated member, the system must reject the request without changing any cart data.
   *
   * For line-item removal eligibility, the system must ensure that the provided `cartItemId` is part of the specified `cartId` cart and is currently eligible for removal. If the item does not exist in that cart (for example, it was already removed or the identifier is invalid), the system must reject (or preserve the cart view as-is) and must not affect any other cart items.
   *
   * After successful removal, the system must ensure the removed line disappears from cart item listings and no longer contributes to cart subtotal/total calculations. Any inventory warning indicators that depended on the removed line must also disappear because the line is no longer present in the cart.
   *
   * @param connection
   * @param cartId Target cart ID. Must refer to a cart owned by the authenticated member; otherwise the system must reject the request.
   * @param cartItemId Target cart item line ID within the cart. Must reference an active cart item row in `shopping_mall_cart_items` for the given cart; otherwise the system must reject (or preserve cart view without changes).
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implementation steps for DELETE /carts/{cartId}/items/{cartItemId}:
   *
   * 1) Authenticate request and obtain authenticated member identifier.
   *
   * 2) Load `shopping_mall_carts` by `id = cartId` with `shopping_mall_member_id` constraint matching the authenticated member.
   *    - If no cart is found, return an authorization/not-found style error without changing data.
   *
   * 3) Load `shopping_mall_cart_items` by `id = cartItemId` and `shopping_mall_cart_id = cartId` and ensure it is currently active (i.e., `deleted_at` is null).
   *    - If not found, reject the request (or no-op that preserves cart view). Do not modify other cart items.
   *
   * 4) Mark the cart item as removed by setting `deleted_at = now()`.
   *
   * 5) Recalculate cart derived state based on remaining active cart items for the cart:
   *    - Compute cart totals by summing `subtotal_amount` across active `shopping_mall_cart_items` for this cart.
   *    - Recompute cart-level warning state (`warning_inventory_insufficient`) by evaluating whether any remaining cart item quantities exceed available inventory semantics (implementation should follow existing inventory-warning logic used when carts/quantities are updated).
   *
   * 6) Persist cart updates in the same transaction as the cart-item removal so that cart view remains consistent.
   *
   * 7) Return HTTP 204/200 with no JSON body (responseBody is null in this operation definition).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":cartItemId")
  public async erase(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("cartId")
    cartId: string & tags.Format<"uuid">,
    @TypedParam("cartItemId")
    cartItemId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteShoppingMallMemberCartsCartIdItemsCartItemId({
        member,
        cartId,
        cartItemId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
