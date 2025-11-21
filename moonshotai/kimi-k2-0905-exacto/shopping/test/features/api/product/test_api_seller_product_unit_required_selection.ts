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

export async function test_api_seller_product_unit_required_selection(
  connection: api.IConnection,
) {
  // Step 1: Create seller account with proper business information
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "sole_proprietorship",
        "corporation",
        "llc",
        "partnership",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create a product with complete specifications
  const productData = {
    sku: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
    condition: "new",
    weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    variants: [],
    images: [],
    ip: "192.168.1.100",
    href: `https://example.com/seller/${seller.id}/products`,
    referrer: `https://example.com/seller/dashboard`,
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 3: Create a required product unit (Size) for customer selection
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

  // Step 4: Create another required unit (Color) for additional validation
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

  // Step 5: Verify that units are properly created with required flags
  TestValidator.equals("size unit name matches", sizeUnit.name, "Size");
  TestValidator.equals("size unit is required", sizeUnit.is_required, true);
  TestValidator.equals(
    "size unit display style",
    sizeUnit.display_style,
    "dropdown",
  );

  TestValidator.equals("color unit name matches", colorUnit.name, "Color");
  TestValidator.equals("color unit is required", colorUnit.is_required, true);
  TestValidator.equals(
    "color unit display style",
    colorUnit.display_style,
    "swatches",
  );

  // Step 6: Validate that both units are associated with the correct product
  TestValidator.equals(
    "size unit product match",
    sizeUnit.product.id,
    product.id,
  );
  TestValidator.equals(
    "color unit product match",
    colorUnit.product.id,
    product.id,
  );

  // Step 7: Verify sort order is maintained
  TestValidator.equals("size unit sort order", sizeUnit.sort_order, 1);
  TestValidator.equals("color unit sort order", colorUnit.sort_order, 2);

  // Step 8: Test business logic - ensure required units force customer selection
  TestValidator.predicate(
    "both units are required for purchase",
    sizeUnit.is_required === true && colorUnit.is_required === true,
  );
}
