import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia from "typia";

import { IShoppingMallCart } from "../../../../../../structures/IShoppingMallCart";

/**
 * Refreshes a member’s cart warning state by re-validating each cart item against the current availability of its referenced product variant.
 *
 * This operation addresses the business requirements where cart items must display an exceed-stock warning when the item quantity is greater than the variant’s current available stock, and where an item must be marked unavailable when its variant is out of stock or unavailable (e.g., deleted/disabled). The cart container maintains a cart-level boolean flag (shopping_mall_carts.warning_inventory_insufficient) representing whether at least one cart item currently has inventory insufficiency issues.
 *
 * The cart line items (shopping_mall_cart_items) store quantity and subtotal_amount captured when stored, while the variant stock/availability is derived from immutable inventory history (shopping_mall_inventory_records) and the variant’s enabled/deleted status (shopping_mall_product_variants.deleted_at and shopping_mall_product_variants.is_active). During this refresh, the system must update each cart item’s displayed eligibility/warning context so there is no stale availability information.
 *
 * This endpoint is intended to be used when the frontend needs to re-check cart warnings after quantity edits or after inventory changes that can occur independently of the cart. It keeps cart totals and warning indicators internally consistent: any availability change must not leave totals/warnings mismatched with the updated set of orderable items.
 *
 * Authorization: only an authenticated member who owns the target cart must be able to refresh it. Guests and other members must not be able to access carts they do not own.
 *
 * Error handling and edge cases:
 * - If the cart does not exist or is not owned by the caller, the operation should fail with an appropriate authorization/not-found error.
 * - If some cart items reference variants that are now out of stock or have been deleted/disabled, those items must become unavailable and supersede any exceed-stock warning context.
 * - If the cart is concurrently modified, the server should perform the refresh using a transaction and compute results from the latest persisted cart items and the current inventory state.
 *
 * Related operations:
 * - Cart item quantity update operations must already re-validate availability and warnings on each update; this endpoint provides an additional explicit refresh when needed.
 * - Cart viewing operations should reflect the latest warning_inventory_insufficient and item-level warning/unavailable context computed by this refresh.
 *
 * @param props.connection
 * @param props.body Refresh criteria identifying which cart should be re-validated for inventory warnings. The server recomputes warnings and unavailability indicators from current variant inventory state.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1) Input parsing: Read refresh request fields to
 *   identify the target cart (e.g., cartId). Validate that cartId is a UUID.
 *
 * 2) Authorization & ownership: Verify the authenticated member owns shopping_mall_carts.id == cartId.
 *
 * 3) Load cart and active cart items:
 * - SELECT shopping_mall_carts by id.
 * - SELECT shopping_mall_cart_items for that cart where deleted_at IS NULL.
 *
 * 4) For all distinct shopping_mall_product_variant_id in the cart items:
 * - Load current variant status from shopping_mall_product_variants: deleted_at (null check) and is_active.
 * - Derive current available quantity from the latest shopping_mall_inventory_records row per variant (use created_at ordering). Compute availability = available_quantity from that record (and respect any disabled/unavailable state from the variant row).
 *
 * 5) Recompute per cart item:
 * - If variant is deleted (shopping_mall_product_variants.deleted_at IS NOT NULL) OR is_active == false OR available_quantity <= 0:
 *   - Mark the cart item as unavailable for checkout (unavailable flag is represented in the API DTO computed from these states; if persistence exists for availability in cart item, update it accordingly).
 *   - Item unavailable status must supersede exceed-stock warning context.
 * - Else if cart item quantity > available_quantity:
 *   - Set cart item warning context to “exceeds stock”.
 * - Else:
 *   - Clear exceed-stock warning context for that item.
 *
 * 6) Recompute cart-level flag:
 * - Set shopping_mall_carts.warning_inventory_insufficient to true if any active cart item is in an exceed-stock warning state (and/or if business defines it for insufficiency). Ensure it matches the computed per-item context.
 *
 * 7) Consistency with totals:
 * - Ensure cart totals returned by the response are computed from the current cart item set and their stored subtotal_amount (and/or recomputed if subtotal_amount is derived during item update). At minimum, do not return totals that contradict the updated warning/unavailability indicators.
 *
 * 8) Persist updates in a transaction:
 * - UPDATE shopping_mall_carts.warning_inventory_insufficient.
 * - If any cart item table has persistable warning/unavailable columns in this schema version, UPDATE them; otherwise, ensure the DTO layer returns computed states.
 *
 * 9) Return refreshed cart representation (summary) including item-level warning/unavailable indicators and cart-level warning_inventory_insufficient.
 *
 * Edge cases:
 * - If the cart becomes empty after excluding deleted cart items, set warning_inventory_insufficient=false.
 * - If inventory records are missing for a variant, treat it as unavailable and mark items unavailable (fail-safe) so checkout restrictions are respected.
 * @path /shoppingMall/member/cart/warnings/refresh
 * @accessor api.functional.shoppingMall.member.cart.warnings.refresh.refreshCartWarnings
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function refreshCartWarnings(
  connection: IConnection,
  props: refreshCartWarnings.Props,
): Promise<refreshCartWarnings.Response> {
  return true === connection.simulate
    ? refreshCartWarnings.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...refreshCartWarnings.METADATA,
          path: refreshCartWarnings.path(),
          status: null,
        },
        props.body,
      );
}
export namespace refreshCartWarnings {
  export type Props = {
    /**
     * Refresh criteria identifying which cart should be re-validated for inventory warnings. The server recomputes warnings and unavailability indicators from current variant inventory state.
     */
    body: IShoppingMallCart.IRequest;
  };
  export type Body = IShoppingMallCart.IRequest;
  export type Response = IShoppingMallCart.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/member/cart/warnings/refresh",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/member/cart/warnings/refresh";
  export const random = (): IShoppingMallCart.ISummary =>
    typia.random<IShoppingMallCart.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: refreshCartWarnings.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: refreshCartWarnings.path(),
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
