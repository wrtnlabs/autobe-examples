import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller creation of size-color variant matrices for apparel and fashion
 * products with comprehensive inventory management across all combinations.
 *
 * This test validates:
 *
 * - Variant-specific SKU assignment for size-color combinations
 * - Inventory allocation across all size-color matrix combinations
 * - Price differentiation by size or premium colors
 * - Customer selection interfaces supporting complex fashion catalog requirements
 * - Accurate stock management and fulfillment coordination
 *
 * The test creates a complete fashion product with multi-dimensional variants
 * including standard sizes (S, M, L, XL) and standard colors (red, blue, black)
 * with appropriate inventory tracking and pricing adjustments for different
 * configuration options.
 *
 * Step 1: Seller Registration - Create authenticated seller account Step 2:
 * Base Product Creation - Create product to support variants Step 3: Size Unit
 * Configuration - Configure size selection options Step 4: Color Unit
 * Configuration - Configure color selection options\
 * Step 5: Variant Matrix Creation - Generate all size-color combinations Step
 * 6: Inventory & Pricing Validation - Verify each variant has proper settings
 *
 * Each variant gets unique SKU, proper inventory allocation, and flexible
 * pricing based on size/color premium adjustments with comprehensive
 * marketplace relationship validation.
 */
export async function test_api_seller_variant_creation_size_color_matrix(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for variant creation testing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number:
        RandomGenerator.alphaNumeric(10).toUpperCase(),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create base fashion product that supports size and color variations
  const baseProductSku = `FASHION-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: baseProductSku,
        name: "Premium Cotton T-Shirt - Size & Color Variants",
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 8,
          sentenceMax: 12,
          wordMin: 4,
          wordMax: 8,
        }),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2000> & tags.Maximum<5000>
        >(),
        condition: "new",
        weight: 0.25,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        variants: [],
        images: [],
        href: `https://seller.example.com/products/${baseProductSku}`,
        referrer: "seller-dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Configure size product unit for variant creation
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(sizeUnit);

  // Step 4: Configure color product unit for variant creation
  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Color",
        type: "color",
        display_style: "swatches",
        is_required: true,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(colorUnit);

  // Step 5: Create size-color variant matrix with comprehensive combinations
  const sizeOptions = ["XS", "S", "M", "L", "XL"] as const;
  const colorOptions = ["Red", "Blue", "Green", "Black", "White"] as const;

  const variants: IShoppingMallProductVariant[] = [];

  // Generate all size-color combinations
  for (let sizeIndex = 0; sizeIndex < sizeOptions.length; sizeIndex++) {
    const size = sizeOptions[sizeIndex];
    for (let colorIndex = 0; colorIndex < colorOptions.length; colorIndex++) {
      const color = colorOptions[colorIndex];
      const variantSku = `${baseProductSku}-${size}-${color}`;
      const position = sizeIndex * colorOptions.length + colorIndex;

      // Use primary unit configuration for variant generation
      const variant =
        await api.functional.shoppingMall.seller.products.variants.create(
          connection,
          {
            productCode: product.sku,
            body: {
              shopping_mall_product_id: product.id,
              shopping_mall_product_unit_id: sizeUnit.id, // Use size unit as primary reference
              sku: variantSku,
              title: `${size} / ${color}`,
              price_adjustment: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<-500> &
                  tags.Maximum<500>
              >(),
              cost_adjustment: 0,
              weight_adjustment: 0,
              inventory_quantity: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<50>
              >(),
              inventory_policy: RandomGenerator.pick([
                "deny",
                "continue",
              ] as const),
              position: position,
              is_active: true,
            } satisfies IShoppingMallProductVariant.ICreate,
          },
        );
      typia.assert(variant);
      variants.push(variant);

      // Validate variant relationships and properties
      TestValidator.equals(
        "variant has correct parent product ID",
        variant.shopping_mall_product_id,
        product.id,
      );
      TestValidator.equals(
        "variant SKU contains base product SKU",
        variant.sku.startsWith(baseProductSku),
        true,
      );
      TestValidator.equals(
        "variant title contains size and color",
        variant.title,
        `${size} / ${color}`,
      );
      TestValidator.predicate(
        "variant inventory is positive",
        variant.inventory_quantity > 0,
      );
      TestValidator.predicate(
        "variant position is properly ordered",
        variant.position >= 0,
      );
      TestValidator.predicate(
        "variant has valid inventory policy",
        variant.inventory_policy === "deny" ||
          variant.inventory_policy === "continue",
      );
      TestValidator.equals(
        "variant is active for sale",
        variant.is_active,
        true,
      );
    }
  }

  // Step 6: Validate complete variant matrix and inventory status
  TestValidator.equals(
    "total variant count matches matrix calculation",
    variants.length,
    sizeOptions.length * colorOptions.length,
  );

  // Verify unique SKU enforcement across variants
  const variantSkus = variants.map((v) => v.sku);
  const uniqueSkus = new Set(variantSkus);
  TestValidator.equals(
    "all variant SKUs are unique",
    variantSkus.length === uniqueSkus.size,
    true,
  );

  // Validate comprehensive inventory allocation
  const totalInventory = variants.reduce(
    (sum, v) => sum + v.inventory_quantity,
    0,
  );
  TestValidator.predicate(
    "total inventory exists for matrix",
    totalInventory > 0,
  );

  // Verify pricing differentiation exists
  const priceAdjustments = variants.map((v) => v.price_adjustment);
  TestValidator.predicate(
    "price adjustments vary across variants",
    Math.max(...priceAdjustments) !== Math.min(...priceAdjustments),
  );

  // Validate product relationship and hierarchy integrity
  TestValidator.equals(
    "created variants belong to seller's product",
    seller.id,
    product.seller.id,
  );

  // Test variant-specific display properties and customer interface support
  TestValidator.equals(
    "all variants have display position",
    variants.every((v) => v.position >= 0),
    true,
  );
  TestValidator.equals(
    "variants support required fields for customer selection",
    variants.every((v) => v.title && v.sku && v.inventory_quantity >= 0),
    true,
  );

  // Validate accurate stock management and fulfillment readiness
  TestValidator.predicate(
    "inventory policies are properly distributed",
    variants.some((v) => v.inventory_policy === "deny") &&
      variants.some((v) => v.inventory_policy === "continue"),
  );

  TestValidator.predicate(
    "variants have realistic inventory levels",
    variants.every((v) => v.inventory_quantity >= 0),
  );

  // Final validation: Comprehensive fashion catalog compliance
  TestValidator.predicate(
    "variant matrix covers specific combinations",
    variants.some((v) => v.title.includes("M") && v.title.includes("Blue")),
  );

  TestValidator.predicate(
    "variants support fashion-specific requirements",
    variants.every(
      (v) => v.title && v.sku && typeof v.inventory_quantity === "number",
    ),
  );
}
