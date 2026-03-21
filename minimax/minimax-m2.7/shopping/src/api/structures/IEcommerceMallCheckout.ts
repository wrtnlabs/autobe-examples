import { tags } from "typia";

import { IEcommerceMallCheckoutPrepareItem } from "./IEcommerceMallCheckoutPrepareItem";
import { IEcommerceMallShippingAddress } from "./IEcommerceMallShippingAddress";

export namespace IEcommerceMallCheckout {
  /**
   * Checkout preparation response containing validated cart items with availability status, shipping address selection, and computed totals. Used by customers to review their checkout before confirming the order.
   */
  export type IPrepare = {
    /**
     * Array of validated cart items with their current availability status, computed prices, and stock warnings for checkout review.
     *
     * @x-autobe-specification 1. JOIN ecommerce_mall_carts with ecommerce_mall_cart_items via cart_id.
     * 2. For each cart item, JOIN with ecommerce_mall_product_variants and ecommerce_mall_products.
     * 3. Validate: variant.deleted_at IS NULL, product.deleted_at IS NULL, variant.quantity >= cart_quantity.
     * 4. Price: use variant.price if NOT NULL, else product.base_price.
     * 5. Subtotal per item: validated_price * quantity.
     * 6. Status per item: 'available' | 'insufficient_stock' | 'unavailable'.
     */
    validatedItems: IEcommerceMallCheckoutPrepareItem[];

    /**
     * Selected shipping address for delivery. Null if customer has no valid shipping addresses available.
     *
     * @x-autobe-specification 1. Query ecommerce_mall_shipping_addresses WHERE ecommerce_mall_customer_id = authenticated_customer_id AND deleted_at IS NULL.
     * 2. Priority: is_default = true first, else ORDER BY created_at DESC LIMIT 1.
     * 3. Return full address object via $ref to IEcommerceMallShippingAddress.
     * 4. If no address found, return null.
     */
    shippingAddress: IEcommerceMallShippingAddress | null;

    /**
     * Flag indicating whether the customer has at least one valid shipping address available for checkout.
     *
     * @x-autobe-specification 1. Query ecommerce_mall_shipping_addresses WHERE ecommerce_mall_customer_id = authenticated_customer_id AND deleted_at IS NULL.
     * 2. Return true if COUNT > 0, else false.
     * 3. Used to prompt customer to add address before checkout.
     */
    hasValidAddress: boolean;

    /**
     * Subtotal price of all available items before shipping and taxes. Calculated from available items only.
     *
     * @x-autobe-specification 1. Filter validatedItems WHERE status = 'available'.
     * 2. For each: price * quantity (variant.price ?? product.base_price).
     * 3. SUM all item subtotals.
     * 4. Return as decimal number.
     */
    subtotal: number;

    /**
     * Grand total price for the checkout. Currently equals subtotal since shipping calculation is not yet implemented.
     *
     * @x-autobe-specification 1. Filter validatedItems WHERE status = 'available'.
     * 2. SUM(price * quantity) for available items.
     * 3. Currently equals subtotal; shipping fees not yet included.
     * 4. Return as decimal number.
     */
    total: number;

    /**
     * Count of cart items that are unavailable or have insufficient stock and cannot be included in this checkout.
     *
     * @x-autobe-specification 1. Count validatedItems WHERE status IN ('insufficient_stock', 'unavailable').
     * 2. Return as integer.
     * 3. Indicates items customer cannot purchase without resolution.
     */
    unavailableItemsCount: number & tags.Type<"int32">;
  };
}
