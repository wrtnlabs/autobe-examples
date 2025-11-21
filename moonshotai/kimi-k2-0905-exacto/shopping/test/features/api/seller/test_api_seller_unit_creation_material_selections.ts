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
 * Test unit creation for material selections including fabric types, metal
 * compositions, wood species, and composite material options.
 *
 * This test validates that sellers can effectively communicate material
 * quality, durability characteristics, and aesthetic properties while
 * maintaining inventory tracking accuracy and customer satisfaction across
 * diverse material preferences.
 *
 * Test flow:
 *
 * 1. Seller registration and authentication
 * 2. Product creation for material-based customization
 * 3. Unit creation for fabric material selection (with swatch display)
 * 4. Unit creation for metal composition options (with dropdown display)
 * 5. Unit creation for wood species selection (with visual buttons)
 * 6. Unit creation for composite material alternatives
 * 7. Validation of inventory tracking with material variations
 * 8. Verification of customer-facing material presentation options
 */
export async function test_api_seller_unit_creation_material_selections(
  connection: api.IConnection,
) {
  // Step 1: Authenticate seller for material-based unit configuration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(1) + " Materials Co.",
      business_registration_number: typia.random<
        string & tags.Pattern<"^[A-Z]{2}[0-9]{6}$">
      >(),
      tax_id: typia.random<string & tags.Pattern<"^[0-9]{2}-[0-9]{7}$">>(),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create products requiring material selection for customer customization
  const woodenFurnitureProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: `WOOD-${RandomGenerator.alphaNumeric(6)}`,
        name: "Custom Dining Table",
        description:
          "Handcrafted dining table with customizable material options for discerning customers",
        price: 1299.99,
        condition: "new",
        weight: 45.5,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: "Custom Dining Table - Premium Materials",
        seo_description:
          "Customize your dining table with premium wood species, metal compositions, or composite materials",
        tags: "dining, furniture, customizable, premium",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://seller.example.com/products/custom-dining-table",
        referrer: "https://seller.example.com/dashboard/products",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(woodenFurnitureProduct);

  const metalFixtureProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: `METAL-${RandomGenerator.alphaNumeric(6)}`,
        name: "Industrial Light Fixture",
        description:
          "Customizable light fixture with various metal composition options for different aesthetic preferences",
        price: 599.99,
        condition: "new",
        weight: 8.2,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: true,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: "Industrial Light Fixture - Metal Options",
        seo_description:
          "Choose from bronze, brass, steel, or aluminum compositions for your perfect lighting solution",
        tags: "lighting, industrial, metal, customizable",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://seller.example.com/products/industrial-light-fixture",
        referrer: "https://seller.example.com/dashboard/products",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(metalFixtureProduct);

  // Step 3: Create fabric material selection unit with swatch display for visual appeal
  const fabricUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: woodenFurnitureProduct.sku,
      body: {
        name: "Upholstery Fabric",
        type: "material",
        display_style: "swatches",
        is_required: false,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(fabricUnit);

  // Step 4: Create metal composition unit with dropdown for technical specifications
  const metalCompositionUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: metalFixtureProduct.sku,
      body: {
        name: "Metal Composition",
        type: "material",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(metalCompositionUnit);

  // Step 5: Create wood species unit with visual button selection for premium materials
  const woodSpeciesUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: woodenFurnitureProduct.sku,
      body: {
        name: "Wood Species",
        type: "material",
        display_style: "buttons",
        is_required: true,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(woodSpeciesUnit);

  // Step 6: Create composite material alternatives unit with dropdown selection
  const compositeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: woodenFurnitureProduct.sku,
      body: {
        name: "Alternative Materials",
        type: "material",
        display_style: "dropdown",
        is_required: false,
        is_multiple: true, // Allow multiple composite options
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(compositeUnit);

  // Step 7: Validate unit creation responses and material display configurations
  TestValidator.equals(
    "fabric unit name matches",
    fabricUnit.name,
    "Upholstery Fabric",
  );
  TestValidator.equals("fabric unit type correct", fabricUnit.type, "material");
  TestValidator.equals(
    "fabric display style",
    fabricUnit.display_style,
    "swatches",
  );
  TestValidator.equals("fabric is optional", fabricUnit.is_required, false);

  TestValidator.equals(
    "metal unit name matches",
    metalCompositionUnit.name,
    "Metal Composition",
  );
  TestValidator.equals(
    "metal unit type correct",
    metalCompositionUnit.type,
    "material",
  );
  TestValidator.equals(
    "metal display style",
    metalCompositionUnit.display_style,
    "dropdown",
  );
  TestValidator.equals(
    "metal is required",
    metalCompositionUnit.is_required,
    true,
  );

  TestValidator.equals(
    "wood unit name matches",
    woodSpeciesUnit.name,
    "Wood Species",
  );
  TestValidator.equals(
    "wood unit type correct",
    woodSpeciesUnit.type,
    "material",
  );
  TestValidator.equals(
    "wood display style",
    woodSpeciesUnit.display_style,
    "buttons",
  );
  TestValidator.equals("wood is required", woodSpeciesUnit.is_required, true);

  TestValidator.equals(
    "composite unit name matches",
    compositeUnit.name,
    "Alternative Materials",
  );
  TestValidator.equals(
    "composite unit type correct",
    compositeUnit.type,
    "material",
  );
  TestValidator.equals(
    "composite display style",
    compositeUnit.display_style,
    "dropdown",
  );
  TestValidator.equals(
    "composite allows multiple",
    compositeUnit.is_multiple,
    true,
  );

  TestValidator.predicate(
    "seller ID matches across operations",
    seller.id === woodenFurnitureProduct.seller.id,
  );
  TestValidator.equals(
    "product status active",
    woodenFurnitureProduct.status,
    "active",
  );
  TestValidator.equals(
    "metal product status active",
    metalFixtureProduct.status,
    "active",
  );

  // Step 8: Verify inventory tracking compatibility with material variations
  TestValidator.predicate(
    "wood tracking enabled",
    woodenFurnitureProduct.track_quantity === true,
  );
  TestValidator.predicate(
    "metal tracking enabled",
    metalFixtureProduct.track_quantity === true,
  );
  TestValidator.predicate(
    "wood backorder disabled",
    woodenFurnitureProduct.allow_backorder === false,
  );
  TestValidator.predicate(
    "metal backorder enabled",
    metalFixtureProduct.allow_backorder === true,
  );

  console.log("✅ Material selection unit creation completed successfully");
  console.log(
    `- Created ${4} material-based product units across ${2} products`,
  );
  console.log(`- Configured swatch display for fabric materials`);
  console.log(
    `- Set up dropdown interfaces for metal compositions and composite materials`,
  );
  console.log(`- Enabled button selection for premium wood species`);
  console.log(
    `- Inventory tracking properly configured for material variations`,
  );
}
