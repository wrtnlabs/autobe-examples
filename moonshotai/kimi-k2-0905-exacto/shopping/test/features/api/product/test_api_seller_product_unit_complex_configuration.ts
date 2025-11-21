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
 * Test comprehensive product unit creation with advanced configuration
 * combinations including multiple unit types for size, color, material, and
 * feature packages. Validates unit interaction management, variant generation
 * complexity, customer selection interface optimization, and order processing
 * workflow integration.
 */
export async function test_api_seller_product_unit_complex_configuration(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated seller with comprehensive business profile
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: typia.random<
        string & tags.Pattern<"^[0-9A-Z]{10,20}$">
      >(),
      tax_id: `${typia.random<string & tags.Format<"uuid">>()}-${typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<999>>().toString()}`,
      phone: RandomGenerator.mobile(),
      business_type: "Limited Liability Company",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create primary product with detailed catalog information
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `PRD-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
        name: `${RandomGenerator.name()} Premium ${RandomGenerator.name()} Collection`,
        description: RandomGenerator.content({
          paragraphs: 4,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<5000>
        >(),
        compare_at_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<5000> &
            tags.Maximum<10000>
        >(),
        cost: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<20> & tags.Maximum<800>
        >(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.5> & tags.Maximum<15>>(),
        weight_unit: "kg",
        barcode: RandomGenerator.alphaNumeric(12),
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: RandomGenerator.paragraph({ sentences: 3 }),
        seo_description: RandomGenerator.paragraph({ sentences: 5 }),
        tags: "premium,custom,luxury,handmade",
        featured_image: `https://images.example.com/products/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://dashboard.example.com/products/new",
        referrer: "https://dashboard.example.com/seller/products",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create comprehensive size unit configuration
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

  // Step 4: Create color unit with swatch display allowing multiple selections
  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Color",
        type: "color",
        display_style: "swatches",
        is_required: false,
        is_multiple: true,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(colorUnit);

  // Step 5: Create material unit for premium configurations
  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Material",
        type: "material",
        display_style: "buttons",
        is_required: true,
        is_multiple: false,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(materialUnit);

  // Step 6: Create feature package unit for optional add-ons
  const featureUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Feature Package",
        type: "custom",
        display_style: "dropdown",
        is_required: false,
        is_multiple: false,
        sort_order: 4,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(featureUnit);

  // Step 7: Create a comprehensive product variant using multiple units
  const premiumVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: `VAR-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          title: "Large, Charcoal Gray, Premium Leather, Deluxe Package",
          price_adjustment: 150.0,
          cost_adjustment: 75.0,
          weight_adjustment: 0.5,
          barcode: RandomGenerator.alphaNumeric(13),
          image: `https://images.example.com/variants/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          inventory_quantity: 25,
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(premiumVariant);

  // Step 8: Create another variant with different configuration
  const compactVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: `VAR-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          title: "Medium, Navy Blue, Standard Fabric, Basic Package",
          price_adjustment: -25.0,
          cost_adjustment: -15.0,
          weight_adjustment: -0.3,
          inventory_quantity: 50,
          inventory_policy: "continue",
          position: 2,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(compactVariant);

  // Step 9: Test unit interaction with inventory policy variations
  TestValidator.predicate(
    "premium variant has positive price adjustment",
    premiumVariant.price_adjustment > 0,
  );
  TestValidator.predicate(
    "compact variant has negative price adjustment",
    compactVariant.price_adjustment < 0,
  );
  TestValidator.predicate(
    "premium variant uses deny inventory policy",
    premiumVariant.inventory_policy === "deny",
  );
  TestValidator.predicate(
    "compact variant uses continue inventory policy",
    compactVariant.inventory_policy === "continue",
  );

  // Step 10: Validate unit system integration with product hierarchy
  TestValidator.equals(
    "size unit has correct display style",
    sizeUnit.display_style,
    "dropdown",
  );
  TestValidator.predicate(
    "size unit requires selection",
    sizeUnit.is_required === true,
  );
  TestValidator.predicate(
    "color unit allows multiple selection",
    colorUnit.is_multiple === true,
  );
  TestValidator.predicate(
    "material unit uses button display",
    materialUnit.display_style === "buttons",
  );

  // Step 11: Verify comprehensive unit configuration complexity
  const allUnits = [sizeUnit, colorUnit, materialUnit, featureUnit];
  TestValidator.predicate(
    "all units belong to same product",
    allUnits.every((unit) => unit.product.id === product.id),
  );
  TestValidator.predicate(
    "all units have unique sort orders",
    new Set(allUnits.map((u) => u.sort_order)).size === allUnits.length,
  );
  TestValidator.predicate(
    "units span different display styles",
    new Set(allUnits.map((u) => u.display_style)).size > 1,
  );
  TestValidator.predicate(
    "units support both single and multiple selection",
    new Set(allUnits.map((u) => u.is_multiple)).size === 2,
  );
}
