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
 * Test product unit creation with various sort orders for optimal customer
 * selection flow and merchandising strategy. Validates display sequence control
 * and its impact on customer configuration decision-making throughout the
 * product selection process.
 */
export async function test_api_seller_product_unit_creation_sort_order(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for product management
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const joinDto = {
    email: sellerEmail,
    business_name: await RandomGenerator.name(),
    business_registration_number: await RandomGenerator.alphaNumeric(10),
    tax_id: await RandomGenerator.alphaNumeric(9),
    phone: await RandomGenerator.mobile(),
    business_type: RandomGenerator.pick([
      "sole_proprietorship",
      "corporation",
      "llc",
      "partnership",
    ] as const),
  } satisfies IShoppingMallSeller.IJoin;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: joinDto });
  typia.assert(seller);
  TestValidator.equals(
    "seller created successfully",
    seller.email,
    sellerEmail,
  );

  // Step 2: Create product in catalog for unit testing
  const currentUrl = typia.random<string & tags.Format<"uri">>();
  const productRequestDto = {
    sku: `TEST-UNIT-${await RandomGenerator.alphaNumeric(8)}`,
    name: `Test Product ${await RandomGenerator.name(2)}`,
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    price: typia.random<number & tags.Minimum<100> & tags.Maximum<10000>>(),
    condition: typia.random<
      string & tags.Pattern<"^(new|used|refurbished)$">
    >(),
    weight: 1.0,
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    seo_title: await RandomGenerator.name(),
    seo_description: RandomGenerator.paragraph(),
    ip: "127.0.0.1",
    href: currentUrl,
    referrer: currentUrl,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productRequestDto,
    });
  typia.assert(product);
  TestValidator.equals(
    "product created successfully",
    product.sku,
    productRequestDto.sku,
  );

  // Step 3: Create size unit with sort_order 1 for primary selection
  const sizeUnitDto = {
    name: "Size",
    type: "size",
    display_style: "dropdown",
    is_required: true,
    is_multiple: false,
    sort_order: 1,
  } satisfies IShoppingMallProductUnit.ICreate;

  const sizeUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: sizeUnitDto,
    });
  typia.assert(sizeUnit);
  TestValidator.equals(
    "size unit created with sort_order 1",
    sizeUnit.sort_order,
    1,
  );
  TestValidator.equals("size unit is required", sizeUnit.is_required, true);
  TestValidator.equals("size unit type", sizeUnit.type, "size");

  // Step 4: Create color unit with sort_order 2 for secondary selection
  const colorUnitDto = {
    name: "Color",
    type: "color",
    display_style: "buttons",
    is_required: false,
    is_multiple: false,
    sort_order: 2,
  } satisfies IShoppingMallProductUnit.ICreate;

  const colorUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: colorUnitDto,
    });
  typia.assert(colorUnit);
  TestValidator.equals(
    "color unit created with sort_order 2",
    colorUnit.sort_order,
    2,
  );
  TestValidator.equals("color unit type", colorUnit.type, "color");
  TestValidator.equals(
    "color unit display style",
    colorUnit.display_style,
    "buttons",
  );

  // Step 5: Create material unit with sort_order 3 for tertiary selection
  const materialUnitDto = {
    name: "Material",
    type: "material",
    display_style: "dropdown",
    is_required: false,
    is_multiple: false,
    sort_order: 3,
  } satisfies IShoppingMallProductUnit.ICreate;

  const materialUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: materialUnitDto,
    });
  typia.assert(materialUnit);
  TestValidator.equals(
    "material unit created with sort_order 3",
    materialUnit.sort_order,
    3,
  );
  TestValidator.equals("material unit type", materialUnit.type, "material");

  // Step 6: Create custom unit for specialized product configurations
  const styleUnitDto = {
    name: "Style",
    type: "style",
    display_style: "swatches",
    is_required: false,
    is_multiple: true,
    sort_order: 4,
  } satisfies IShoppingMallProductUnit.ICreate;

  const styleUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: styleUnitDto,
    });
  typia.assert(styleUnit);
  TestValidator.equals(
    "style unit created with sort_order 4",
    styleUnit.sort_order,
    4,
  );
  TestValidator.equals(
    "style unit is_multiple enabled",
    styleUnit.is_multiple,
    true,
  );
  TestValidator.equals(
    "style unit display style",
    styleUnit.display_style,
    "swatches",
  );

  // Step 7: Test lower sort_order units appear first to optimize customer experience
  const lowSortUnitDto = {
    name: "Edition",
    type: "custom",
    display_style: "dropdown",
    is_required: false,
    is_multiple: false,
    sort_order: 0,
  } satisfies IShoppingMallProductUnit.ICreate;

  const editionUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: lowSortUnitDto,
    });
  typia.assert(editionUnit);
  TestValidator.equals(
    "edition unit created with sort_order 0",
    editionUnit.sort_order,
    0,
  );
  TestValidator.predicate(
    "edition unit should appear before size unit",
    editionUnit.sort_order < sizeUnit.sort_order,
  );

  // Step 8: Validate total unit creation count and merchandising strategy impact
  TestValidator.predicate(
    "edition unit created successfully",
    editionUnit.id !== null && editionUnit.id !== undefined,
  );
  TestValidator.equals(
    "edition unit product relationship",
    editionUnit.product.id,
    product.id,
  );
  TestValidator.predicate(
    "seller business verification completed",
    seller.is_verified === true || seller.verification_status === "verified",
  );

  // Step 9: Validate cascading sort order impact on customer configuration flow
  const units = [
    editionUnit,
    sizeUnit,
    colorUnit,
    materialUnit,
    styleUnit,
  ].sort((a, b) => a.sort_order - b.sort_order);
  TestValidator.predicate(
    "units sorted by sort_order properly",
    units[0].sort_order === 0,
  );
  TestValidator.predicate(
    "edition unit appears first",
    units[0].name === "Edition",
  );
  TestValidator.predicate("size unit appears second", units[1].name === "Size");
  TestValidator.predicate(
    "color unit appears third",
    units[2].name === "Color",
  );
  TestValidator.predicate(
    "material unit appears fourth",
    units[3].name === "Material",
  );
  TestValidator.predicate(
    "style unit appears fifth",
    units[4].name === "Style",
  );

  // Step 10: Validate merchandising strategy implications
  TestValidator.predicate(
    "required units should appear early for better UX",
    sizeUnit.is_required === true && sizeUnit.sort_order <= 3,
  );
  TestValidator.predicate(
    "multiple selection should allow customer flexibility",
    styleUnit.is_multiple === true,
  );
  TestValidator.predicate(
    "dropdown display optimized for many options",
    units.filter((u) => u.display_style === "dropdown").length >= 2,
  );
  TestValidator.predicate(
    "button display for visual selection",
    colorUnit.display_style === "buttons",
  );
  TestValidator.predicate(
    "swatch display for color/style options",
    styleUnit.display_style === "swatches",
  );
}
