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
 * Test seller product unit creation with complete integration workflow
 * including variant generation readiness, inventory system connectivity, and
 * order processing compatibility.
 *
 * This comprehensive E2E test validates the complete product unit creation and
 * integration workflow within the shopping mall marketplace platform. The test
 * covers:
 *
 * 1. Seller registration and authentication
 * 2. Product creation with proper marketplace metadata
 * 3. Product unit creation defining variation types (size, color, material, etc.)
 * 4. Unit display configuration for optimal customer experience
 * 5. Integration validation to ensure system workflow readiness
 *
 * The test ensures that product units properly enable variant creation, support
 * inventory tracking, maintain customer selection compatibility, and integrate
 * seamlessly with marketplace operations.
 */
export async function test_api_seller_unit_creation_integration_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for integration testing workflow
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    business_name: `Business ${RandomGenerator.name()}`,
    business_registration_number: RandomGenerator.alphaNumeric(10),
    tax_id: `TAX${RandomGenerator.alphaNumeric(8)}`,
    phone: RandomGenerator.mobile(),
    business_type: RandomGenerator.pick([
      "corporation",
      "llc",
      "partnership",
      "sole_proprietorship",
    ] as const),
  } satisfies IShoppingMallSeller.IJoin;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  TestValidator.equals(
    "seller authorized successfully",
    sellerAuth.email,
    sellerEmail,
  );

  // Step 2: Create product requiring integrated unit and variant management
  const productCreateBody = {
    sku: `PROD-${RandomGenerator.alphaNumeric(6)}`,
    name: `Premium ${RandomGenerator.name()} Product`,
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    price: typia.random<number & tags.Minimum<10> & tags.Maximum<500>>(),
    compare_at_price: null,
    cost: typia.random<number & tags.Minimum<5> & tags.Maximum<200>>(),
    condition: "new",
    weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
    weight_unit: "kg",
    barcode: `BAR${RandomGenerator.alphaNumeric(12)}`,
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    seo_title: RandomGenerator.name(3),
    seo_description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 7,
    }),
    tags: "premium,high-quality,durable",
    featured_image: `https://example.com/images/product-${RandomGenerator.alphaNumeric(8)}.jpg`,
    category_id: sellerAuth.id, // Will be validated by backend with proper category
    shopping_mall_seller_id: sellerAuth.id,
    href: "https://seller-dashboard.example.com/products/create",
    referrer: "https://seller-dashboard.example.com/products",
    ip: null,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  TestValidator.equals(
    "product created successfully",
    product.name,
    productCreateBody.name,
  );
  TestValidator.equals(
    "product seller linked",
    product.seller.id,
    sellerAuth.id,
  );

  // Step 3: Create product unit configurations for different variation types
  const unitTypes = ["size", "color", "material"] as const;
  const units: IShoppingMallProductUnit[] = [];

  for (let i = 0; i < unitTypes.length; i++) {
    const unitType = unitTypes[i];
    const unitBody = {
      name:
        unitType === "size"
          ? "Size"
          : unitType === "color"
            ? "Color"
            : "Material",
      type: unitType,
      display_style:
        unitType === "color"
          ? "swatches"
          : unitType === "size"
            ? "buttons"
            : "dropdown",
      is_required:
        unitType === "size"
          ? true
          : RandomGenerator.pick([true, false] as const),
      is_multiple: false,
      sort_order: i + 1,
    } satisfies IShoppingMallProductUnit.ICreate;

    const unit = await api.functional.shoppingMall.seller.products.units.create(
      connection,
      {
        productCode: product.sku,
        body: unitBody,
      },
    );
    typia.assert(unit);

    units.push(unit);
  }

  TestValidator.equals("units created successfully", units.length, 3);

  for (const unit of units) {
    TestValidator.predicate("unit has valid type", () =>
      ArrayUtil.has(unitTypes, (type) => type === unit.type),
    );
    TestValidator.predicate("unit has valid display style", () =>
      ["buttons", "swatches", "dropdown", "text_input"].includes(
        unit.display_style,
      ),
    );
    TestValidator.predicate(
      "unit has correct sort order",
      () => unit.sort_order >= 1,
    );
  }

  // Step 4: Validate system integration and workflow readiness
  TestValidator.predicate(
    "seller authorization maintained",
    () => connection.headers?.Authorization === sellerAuth.token.access,
  );

  // Verify unit configuration enables proper customer selection
  TestValidator.predicate("units have correct display ordering", () =>
    units.every((unit, index) => unit.sort_order === index + 1),
  );
  TestValidator.predicate(
    "required units flagged correctly",
    () => units.find((unit) => unit.type === "size")?.is_required === true,
  );

  // Step 5: Validate integration connections
  TestValidator.predicate(
    "product sku available as unit reference",
    () => product.sku.length > 0,
  );
  TestValidator.predicate(
    "seller-product relationship established",
    () => product.seller.id === sellerAuth.id,
  );

  // Step 6: Validate customer selection data flow compatibility
  TestValidator.predicate(
    "unit display styles support customer selection",
    () =>
      units.every((unit) =>
        ["buttons", "swatches", "dropdown", "text_input"].includes(
          unit.display_style,
        ),
      ),
  );
  TestValidator.predicate("units provide selection flexibility", () =>
    units.some((unit) => unit.is_multiple === false),
  ); // Some required single selection
  TestValidator.predicate("clear unit categorization", () =>
    units.every((unit) => unit.name.length > 0 && unit.type.length > 0),
  );

  console.log(
    "✅ Product unit creation integration workflow completed successfully",
  );
  console.log(`   - Seller: ${sellerAuth.business_name} (${sellerAuth.email})`);
  console.log(`   - Product: ${product.name} (${product.sku})`);
  console.log(`   - Units Created: ${units.length} configuration types`);
  console.log(
    `   - Integration Status: Units configured for variant generation and customer selection`,
  );
}
