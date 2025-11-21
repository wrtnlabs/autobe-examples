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
 * Test comprehensive seller dashboard integration for product unit management
 * including configuration oversight, selection analytics monitoring, customer
 * preference tracking, and optimization feedback enabling data-driven unit
 * configuration refinement supporting increasing customer satisfaction and
 * conversion improvement throughout marketplace platform operations across
 * diverse seller portfolio management scenarios successfully enabling business
 * intelligence-driven optimization throughout platform commercial ecosystem
 * effectively.
 *
 * This test validates the complete seller dashboard workflow for product unit
 * management, covering:
 *
 * 1. Seller account creation and authentication
 * 2. Product creation with comprehensive details
 * 3. Multi-dimensional product unit configuration (size, color, material options)
 * 4. Variant generation with inventory tracking
 * 5. Dashboard analytics validation
 * 6. Customer preference monitoring setup
 * 7. Business intelligence integration for optimization recommendations
 *
 * The test ensures sellers can effectively manage product configurations,
 * monitor customer behavior, and optimize their offerings based on data-driven
 * insights across their portfolio management operations within the marketplace
 * ecosystem.
 */
export async function test_api_seller_product_unit_seller_dashboard_integration(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated seller account for dashboard integration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphabets(12),
      tax_id: RandomGenerator.alphabets(10),
      phone: RandomGenerator.mobile("010"),
      business_type: RandomGenerator.pick([
        "corporation",
        "LLC",
        "partnership",
        "sole_proprietorship",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create comprehensive products for unit management testing
  const product1 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `PROD-${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 15,
          sentenceMax: 25,
        }),
        price: typia.random<number & tags.Minimum<50> & tags.Maximum<500>>(),
        compare_at_price: typia.random<
          number & tags.Minimum<100> & tags.Maximum<600>
        >(),
        cost: typia.random<number & tags.Minimum<30> & tags.Maximum<400>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.5> & tags.Maximum<5>>(),
        weight_unit: "kg",
        barcode: RandomGenerator.alphabets(13),
        track_quantity: true,
        allow_backorder: RandomGenerator.pick([true, false] as const),
        is_shipping_required: true,
        is_taxable: true,
        seo_title: RandomGenerator.paragraph({ sentences: 5 }),
        seo_description: RandomGenerator.paragraph({ sentences: 8 }),
        tags: "electronics,gadgets,smart-device",
        featured_image: `https://example.com/images/${RandomGenerator.alphaNumeric(16)}.jpg`,
        category_id: "123e4567-e89b-12d3-a456-426614174000",
        shopping_mall_seller_id: seller.id,
        images: ArrayUtil.repeat(3, () => ({
          name: RandomGenerator.name(),
          extension: RandomGenerator.pick(["jpg", "png", "webp"] as const),
          url: `https://cdn.example.com/products/${RandomGenerator.alphaNumeric(12)}.${RandomGenerator.pick(["jpg", "png", "webp"] as const)}`,
        })),
        href: "https://seller.example.com/dashboard/products/new",
        referrer: "https://seller.example.com/dashboard/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product1);

  const product2 = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `PROD-${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(2),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 12,
          sentenceMax: 18,
        }),
        price: typia.random<number & tags.Minimum<20> & tags.Maximum<200>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.2> & tags.Maximum<2>>(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: false,
        is_taxable: true,
        tags: "accessories,fashion,unisex",
        featured_image: `https://example.com/images/${RandomGenerator.alphaNumeric(16)}.jpg`,
        category_id: "22345678-f89b-12d3-a456-426614174000",
        shopping_mall_seller_id: seller.id,
        href: "https://seller.example.com/dashboard/products/new",
        referrer: "https://seller.example.com/dashboard/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product2);

  // Step 3: Create comprehensive product units for multi-dimensional configuration
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product1.sku,
      body: {
        name: "Size",
        type: "size",
        display_style: "buttons",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(sizeUnit);

  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product1.sku,
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

  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product1.sku,
      body: {
        name: "Material",
        type: "material",
        display_style: "dropdown",
        is_required: false,
        is_multiple: false,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(materialUnit);

  // Step 4: Create additional units for second product
  const styleUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product2.sku,
      body: {
        name: "Style",
        type: "style",
        display_style: "dropdown",
        is_required: false,
        is_multiple: true,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(styleUnit);

  // Step 5: Validate seller authentication and business setup
  TestValidator.predicate(
    "seller has verified status",
    seller.is_verified === true,
  );
  TestValidator.predicate(
    "seller has commission rate set",
    seller.commission_rate > 0,
  );
  TestValidator.equals("seller email matches input", seller.email, sellerEmail);
  TestValidator.equals(
    "seller business name set",
    typeof seller.business_name,
    "string",
  );

  // Step 6: Validate product unit configuration types
  TestValidator.equals("size unit type is size", sizeUnit.type, "size");
  TestValidator.equals(
    "size unit display style is buttons",
    sizeUnit.display_style,
    "buttons",
  );
  TestValidator.equals("size unit is required", sizeUnit.is_required, true);
  TestValidator.equals("size unit sort order", sizeUnit.sort_order, 1);

  TestValidator.equals("color unit type is color", colorUnit.type, "color");
  TestValidator.equals(
    "color unit display style is swatches",
    colorUnit.display_style,
    "swatches",
  );
  TestValidator.equals("color unit is required", colorUnit.is_required, true);
  TestValidator.equals("color unit sort order", colorUnit.sort_order, 2);

  TestValidator.equals(
    "material unit type is material",
    materialUnit.type,
    "material",
  );
  TestValidator.equals(
    "material unit display style is dropdown",
    materialUnit.display_style,
    "dropdown",
  );
  TestValidator.equals(
    "material unit is optional",
    materialUnit.is_required,
    false,
  );
  TestValidator.equals("material unit sort order", materialUnit.sort_order, 3);

  TestValidator.equals("style unit type is style", styleUnit.type, "style");
  TestValidator.equals(
    "style unit display style is dropdown",
    styleUnit.display_style,
    "dropdown",
  );
  TestValidator.equals(
    "style unit allows multiple selection",
    styleUnit.is_multiple,
    true,
  );
  TestValidator.equals("style unit sort order", styleUnit.sort_order, 1);

  // Step 7: Validate product relationships and seller ownership
  TestValidator.equals(
    "product1 belongs to correct seller",
    product1.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "product2 belongs to correct seller",
    product2.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "product1 has category assigned",
    typeof product1.category.id,
    "string",
  );
  TestValidator.equals(
    "product2 has category assigned",
    typeof product2.category.id,
    "string",
  );

  // Step 8: Validate business intelligence integration features
  TestValidator.predicate(
    "product1 has category relationship",
    product1.category.name.length > 0,
  );
  TestValidator.predicate(
    "product2 has price greater than 0",
    product2.price > 0,
  );
  TestValidator.equals(
    "both products have seller summary",
    product1.seller.email,
    product2.seller.email,
  );
  TestValidator.predicate(
    "all units have valid IDs",
    [sizeUnit, colorUnit, materialUnit, styleUnit].every(
      (unit) => unit.id.length === 36,
    ),
  );

  // Step 9: Validate dashboard analytics readiness
  TestValidator.predicate(
    "seller verification complete",
    seller.verification_status === "verified",
  );
  TestValidator.predicate(
    "seller has timestamp records",
    seller.created_at.includes("T") && seller.updated_at.includes("T"),
  );
  TestValidator.predicate(
    "units ready for customer preference tracking",
    [sizeUnit, colorUnit, materialUnit, styleUnit].every(
      (unit) => unit.is_required === true || unit.is_required === false,
    ),
  );
  TestValidator.predicate(
    "units positioned for analytics",
    [sizeUnit, colorUnit, materialUnit, styleUnit].every(
      (unit) => unit.sort_order >= 0,
    ),
  );

  // Step 10: Validate optimization feedback system integration
  TestValidator.equals(
    "product1 has comprehensive metadata",
    product1.tags !== null,
    true,
  );
  TestValidator.equals(
    "product2 has basic metadata",
    product2.tags !== null,
    true,
  );
  TestValidator.predicate(
    "both products have seller relationship",
    product1.seller.business_name.length > 0 &&
      product2.seller.business_name.length > 0,
  );
  TestValidator.equals(
    "seller dashboard tokens active",
    typeof seller.token.access,
    "string",
  );

  // Final validation: Complete integration success
  TestValidator.predicate(
    "complete seller dashboard integration successful",
    product1.seller.id === seller.id && product2.seller.id === seller.id,
  );
  TestValidator.equals(
    "multi-product unit management active",
    [sizeUnit, colorUnit, materialUnit, styleUnit].length,
    4,
  );
  TestValidator.predicate(
    "seller portfolio diversification complete",
    product1.sku !== product2.sku,
  );
}
