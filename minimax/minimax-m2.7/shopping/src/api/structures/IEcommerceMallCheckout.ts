import { tags } from "typia";

import { IEcommerceMallCheckoutItem } from "./IEcommerceMallCheckoutItem";
import { IEcommerceMallShippingAddress } from "./IEcommerceMallShippingAddress";

export namespace IEcommerceMallCheckout {
  /**
   * Checkout summary for authenticated customer containing validated cart items, available shipping addresses, and computed totals.
   *
   * This response is returned when a customer requests the checkout summary. It validates all items in their shopping cart, retrieves available shipping addresses, and computes totals for payment processing.
   *
   * Items: Each cart item is validated for availability. Available items are included in the grand total, while unavailable items are listed separately for customer awareness.
   *
   * Addresses: All non-deleted shipping addresses are returned. The default address is indicated for pre-selection in the checkout UI.
   *
   * Summary: Grand total includes only valid (non-unavailable) items. The customer must resolve unavailable items before proceeding with payment.
   */
  export type ISummary = {
    /**
     * Validated cart items with availability status.
     *
     * An array of all items in the customer's shopping cart, each validated for availability. Items are checked against their product variants for existence and stock quantity. Each item includes its validation status, available quantity, unit price, and computed subtotal.
     *
     * Status values: AVAILABLE indicates the item can be purchased, OUT_OF_STOCK indicates requested quantity exceeds available stock, UNAVAILABLE indicates the variant has been soft-deleted.
     *
         * @x-autobe-specification Fetched from ecommerce_mall_cart_items with
         *   JOIN to ecommerce_mall_product_variants and
         *   ecommerce_mall_products. Each item is validated: variant must exist
         *   with deleted_at IS NULL, product must exist with deleted_at IS
         *   NULL. Item status determined by variant availability and stock:
         *   AVAILABLE (in stock and variant exists), OUT_OF_STOCK (quantity
         *   exceeds available stock), UNAVAILABLE (variant soft-deleted).
         *   Subtotal computed as quantity multiplied by variant price
         *   (price_override if not null, else product base_price).
     */
    items: IEcommerceMallCheckout.ISummary.IItem[];

    /**
     * Available shipping addresses for the customer.
     *
     * An array of shipping addresses the customer has saved to their account. These addresses are available for selection during checkout. Only non-deleted addresses are included.
     *
     * Each address includes the recipient name, city, state, country, and default status indicator for pre-selection in the checkout UI.
     *
         * @x-autobe-specification Cross-table mapping to
         *   ecommerce_mall_shipping_addresses. Fetches via
         *   IEcommerceMallShippingAddress.ISummary: SELECT id, recipient_name,
         *   city, state, country, is_default FROM
         *   ecommerce_mall_shipping_addresses WHERE deleted_at IS NULL AND
         *   ecommerce_mall_customer_id = authenticated_customer_id. Items
         *   reference ecommerce_mall_shipping_addresses.id.
     */
    addresses: IEcommerceMallShippingAddress.ISummary[];

    /**
     * Computed totals for checkout.
     *
     * Aggregated summary statistics calculated from the validated cart items. Includes the grand total for all valid items, total count of all items, and counts distinguishing between available and unavailable items.
     *
     * This data is used by the client to display checkout totals and inform the customer of any cart issues that need resolution before proceeding with payment.
     *
         * @x-autobe-specification Computed aggregations from validated cart
         *   items: grandTotal = SUM(quantity * unit_price) for valid
         *   (non-unavailable) items only, totalItems = COUNT(all items),
         *   validItemsCount = COUNT(items with AVAILABLE status),
         *   unavailableItemsCount = COUNT(items with OUT_OF_STOCK or
         *   UNAVAILABLE status).
     */
    summary: {
      /**
       * Sum of subtotals for all valid (available) items.
       */
      grandTotal: number;

      /**
       * Total number of items in the cart.
       */
      totalItems: number & tags.Type<"int32">;

      /**
       * Number of items with AVAILABLE status.
       */
      validItemsCount: number & tags.Type<"int32">;

      /**
       * Number of items with OUT_OF_STOCK or UNAVAILABLE status.
       */
      unavailableItemsCount: number & tags.Type<"int32">;
    };
  };
  export namespace ISummary {
    /**
     * Validated cart item for checkout with availability status and pricing.
     *
     * Represents a single item in the customer's shopping cart with validation results. Each item is checked for availability against the product variant's existence and stock quantity. The response includes computed pricing and embedded snapshots of the variant and product for display during checkout.
     *
     * **Validation Status:**
     * - AVAILABLE: The variant exists, is not deleted, and has sufficient stock
     * - OUT_OF_STOCK: The variant exists but requested quantity exceeds available stock
     * - UNAVAILABLE: The variant has been soft-deleted and cannot be purchased
     *
     * **Pricing:** Unit price is derived from the variant's price override if set, otherwise the product's base price. Subtotal is the quantity multiplied by the unit price for valid items.
     */
    export type IItem = {
      /**
       * Unique identifier of the cart item.
       *
       * UUID assigned when the item was added to the cart. Used for cart item update and removal operations.
       *
             * @x-autobe-specification Direct mapping from
             *   ecommerce_mall_cart_items.id. UUID assigned when item was added
             *   to cart. Used for cart item update and removal operations.
       */
      id: string & tags.Format<"uuid">;

      /**
       * Requested quantity of this variant in the cart.
       *
       * The number of units the customer has added to their cart. This value is compared against availableQuantity to determine the validation status.
       *
             * @x-autobe-specification Direct mapping from
             *   ecommerce_mall_cart_items.quantity. The number of units
             *   requested by the customer. Compared against availableQuantity
             *   to determine validation status.
       */
      quantity: number & tags.Type<"int32">;

      /**
       * Availability status of the cart item.
       *
       * Indicates whether the item can be purchased in the requested quantity. AVAILABLE means the item is ready for checkout. OUT_OF_STOCK means insufficient inventory exists. UNAVAILABLE means the variant has been deleted and cannot be purchased.
       *
             * @x-autobe-specification Computed from ecommerce_mall_cart_items
             *   JOIN ecommerce_mall_product_variants: IF
             *   product_variants.deleted_at IS NOT NULL THEN 'UNAVAILABLE' ELSE
             *   IF product_variants.quantity < cart_items.quantity THEN
             *   'OUT_OF_STOCK' ELSE 'AVAILABLE'. Checks variant existence and
             *   stock availability.
       */
      status: "AVAILABLE" | "OUT_OF_STOCK" | "UNAVAILABLE";

      /**
       * Current available stock quantity for this variant.
       *
       * The number of units in stock at the time of checkout validation. Items with requested quantity exceeding this value are flagged as OUT_OF_STOCK.
       *
             * @x-autobe-specification Direct mapping from
             *   ecommerce_mall_cart_items JOIN ecommerce_mall_product_variants:
             *   product_variants.quantity. Current available stock at time of
             *   checkout validation.
       */
      availableQuantity: number & tags.Type<"int32">;

      /**
       * Unit price for this variant.
       *
       * The price per unit used for subtotal calculation. Derived from the variant's price override if set, otherwise from the product's base price.
       *
             * @x-autobe-specification Computed from ecommerce_mall_cart_items
             *   JOIN ecommerce_mall_product_variants JOIN
             *   ecommerce_mall_products: COALESCE(product_variants.price,
             *   products.base_price). Uses variant price override if set,
             *   otherwise falls back to product base price.
       */
      unitPrice: number;

      /**
       * Computed subtotal for this cart item.
       *
       * The total price for this line item, calculated as quantity multiplied by unitPrice. Only valid (non-unavailable) items are included in the grand total.
       *
             * @x-autobe-specification Computed as
             *   ecommerce_mall_cart_items.quantity *
             *   COALESCE(ecommerce_mall_product_variants.price,
             *   ecommerce_mall_products.base_price). Only valid for
             *   non-unavailable items.
       */
      subtotal: number;

      /**
       * Embedded product variant snapshot.
       *
       * Contains the essential variant information for display during checkout. Includes the SKU code for inventory reference, variant display name, option key-value pairs (such as size or color), thumbnail image, and base price.
       *
             * @x-autobe-specification Composition relation from
             *   ecommerce_mall_cart_items to ecommerce_mall_product_variants
             *   via productVariant relation. Returns embedded object with
             *   essential display fields including sku_code, option_values,
             *   thumbnail, and price.
       */
      variant: IEcommerceMallCheckoutItem.IVariant;

      /**
       * Embedded product snapshot.
       *
       * Contains essential product information for display during checkout. Includes the product identifier and display name.
       *
             * @x-autobe-specification Composition relation via
             *   ecommerce_mall_cart_items → ecommerce_mall_product_variants →
             *   ecommerce_mall_products via product relation chain. Returns
             *   embedded object with essential display fields including id and
             *   name.
       */
      product: IEcommerceMallCheckoutItem.IProduct;
    };
  }

  /**
   * Checkout validation error representing blocking errors that prevent customers from proceeding to payment.
   *
   * This schema defines error objects returned during checkout validation. Each error contains a code identifying the error category, a human-readable message describing the issue, and an optional reference to the specific cart item when the error relates to a particular item.
   *
   * **Error Categories**
   *
   * - PRODUCT_UNAVAILABLE: Product or variant has been deleted or is no longer available
   * - STOCK_INSUFFICIENT: Requested quantity exceeds available stock
   * - ADDRESS_MISSING: No valid shipping address exists for checkout
   * - CART_EMPTY: Customer has no items in their shopping cart
   *
   * Errors block checkout and must be resolved before the customer can place an order. The cartItemId field is null for errors not tied to specific cart items (ADDRESS_MISSING, CART_EMPTY).
   */
  export type IValidationError = {
    /**
     * Error code categorizing the type of blocking error.
     *
     * Categorizes the validation error to help clients display appropriate error indicators and take corrective actions. Error codes distinguish between product availability issues, stock problems, and configuration issues.
     *
     * **Available Codes**
     *
     * - PRODUCT_UNAVAILABLE: Product or variant has been deleted or is no longer available for purchase
     * - STOCK_INSUFFICIENT: Requested quantity exceeds currently available stock
     * - ADDRESS_MISSING: No valid shipping address exists for this customer
     * - CART_EMPTY: Customer has no items in their shopping cart
     *
         * @x-autobe-specification Enum values generated by checkout validation
         *   logic. Possible values: PRODUCT_UNAVAILABLE (product/variant
         *   deleted or unavailable), STOCK_INSUFFICIENT (quantity exceeds
         *   available stock), ADDRESS_MISSING (no valid shipping address),
         *   CART_EMPTY (no items in cart).
     */
    code: string;

    /**
     * Human-readable error message describing the specific validation error.
     *
     * Provides customers with clear, actionable information about why checkout cannot proceed. Messages are generated dynamically based on the error context and provide specific details.
     *
     * **Message Examples**
     *
     * - 'This product is no longer available'
     * - 'Only 3 items available but you requested 5'
     * - 'Please add a shipping address before checkout'
     * - 'Your cart is empty'
     *
     * **Message Formatting**
     *
     * Messages are localized and formatted with appropriate details such as product names, quantities, and specific requirements.
     *
         * @x-autobe-specification Computed human-readable error message
         *   generated during checkout validation. Message is dynamically
         *   formatted based on error context including product names,
         *   quantities, and specific requirements. Examples: 'This product is
         *   no longer available', 'Only 3 items available but you requested 5'.
     */
    message?: string | undefined;

    /**
     * Identifier of the cart item this error relates to, if applicable.
     *
     * When an error pertains to a specific cart item (such as product unavailability or insufficient stock), this field contains the cart item's unique identifier. For general errors not tied to a specific item, this field is null.
     *
     * **Use Cases**
     *
     * - PRODUCT_UNAVAILABLE: Identifies which cart item's product/variant is unavailable
     * - STOCK_INSUFFICIENT: Identifies which cart item has insufficient stock
     * - ADDRESS_MISSING: Always null (not tied to specific item)
     * - CART_EMPTY: Always null (not tied to specific item)
     *
         * @x-autobe-specification Optional UUID reference to
         *   ecommerce_mall_cart_items table. Set when error relates to a
         *   specific cart item (PRODUCT_UNAVAILABLE, STOCK_INSUFFICIENT). Null
         *   for general errors (ADDRESS_MISSING, CART_EMPTY).
     */
    cartItemId?: (string & tags.Format<"uuid">) | undefined;
  };
}
