import { tags } from "typia";

import { IEcommerceMallCheckoutItemVariantOption } from "./IEcommerceMallCheckoutItemVariantOption";

export namespace IEcommerceMallCheckoutItem {
  /**
   * Embedded product snapshot for checkout display.
   *
   * Contains the minimal product information required during the checkout process. This lightweight snapshot provides the product identifier and display name, enabling customers to verify they are purchasing the correct items during order confirmation.
   *
   * **Usage Context:** This type is embedded within checkout cart item responses, not returned as a standalone entity. It is not suitable for product browsing or detailed product information.
   */
  export type IProduct = {
    /**
     * Unique identifier of the product.
     *
     * UUID assigned when the product was created. Used to identify the product during checkout and link to full product details if needed.
     *
         * @x-autobe-specification Source: ecommerce_mall_products.id via
         *   cart_items → product_variants → products JOIN chain. UUID primary
         *   key identifying the product.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Display name of the product.
     *
     * The product's human-readable name as shown on the product listing page. Used for order confirmation and customer verification.
     *
         * @x-autobe-specification Source: ecommerce_mall_products.name via
         *   cart_items → product_variants → products JOIN chain. Product
         *   display name from the products table.
     */
    name: string;
  };

  /**
   * Embedded product variant snapshot for checkout display.
   *
   * Contains essential variant information that customers see when reviewing their cart items before purchase. Includes the SKU code for inventory reference, variant display name, option key-value pairs (such as size or color), thumbnail image, and base price.
   *
   * **Use Cases:**
   * - Displayed in cart item validation results
   * - Shown during checkout order preview
   * - Used for order confirmation details
   */
  export type IVariant = {
    /**
     * Unique identifier of the product variant.
     *
     * UUID assigned when the variant was created. Used for inventory reference and cart item validation.
     *
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_product_variants.id. UUID primary key assigned at
         *   variant creation.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Unique SKU (Stock Keeping Unit) code identifying this variant.
     *
     * Used for inventory tracking and reference during order fulfillment. Must be unique across the platform.
     *
         * @x-autobe-specification Direct mapping from
         *   ecommerce_mall_product_variants.sku_code. Unique constraint ensures
         *   SKU uniqueness across platform.
     */
    skuCode: string;

    /**
     * Display name of the product variant.
     *
     * Human-readable name combining option values for customer recognition, such as 'Red - Large' or 'Blue - Small'.
     *
         * @x-autobe-specification Computed as ecommerce_mall_products.name + '
         *   - ' + joined option values from
         *   ecommerce_mall_product_variant_option_values. Format: 'Product Name
         *   - Color - Size'. If no options exist, returns just the product
         *   name.
     */
    name: string;

    /**
     * Array of option key-value pairs for this variant.
     *
     * Each option represents a selectable attribute such as color, size, or any other product-specific option.
     *
         * @x-autobe-specification Maps from
         *   ecommerce_mall_product_variant_option_values relation. Each option
         *   row provides key-value pair (e.g., color=Red, size=Large). Joins
         *   via ecommerce_mall_product_variants.id.
     */
    options: IEcommerceMallCheckoutItemVariantOption[];

    /**
     * Thumbnail image URL for this variant.
     *
     * Product image URL for visual display during checkout. May be null if no image is associated with the variant.
     *
         * @x-autobe-specification First image from
         *   ecommerce_mall_product_images relation ordered by display_order ASC
         *   (where display_order = 0). Falls back to null if no images exist
         *   for the product.
     */
    thumbnail?: string | null | undefined;

    /**
     * Base price for this variant.
     *
     * The price used for this variant, which may be the variant's own price override or null if using the product's base price.
     *
         * @x-autobe-specification Uses ecommerce_mall_product_variants.price if
         *   not null. Falls back to ecommerce_mall_products.base_price when
         *   variant has no price override. Decimal precision from
         *   DoublePrecision type.
     */
    basePrice: number | null;
  };
}
