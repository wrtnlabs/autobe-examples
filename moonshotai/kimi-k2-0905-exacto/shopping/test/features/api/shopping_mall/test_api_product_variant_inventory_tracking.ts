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
 * Test variant retrieval with comprehensive inventory management including
 * real-time stock levels, inventory policies, and availability status.
 * Validates accurate inventory status reflection, backorder configuration
 * handling, and customer visibility of stock information for purchase
 * confidence.
 *
 * Test workflow:
 *
 * 1. Create seller account with proper authentication
 * 2. Create a product with inventory tracking enabled
 * 3. Configure product units for variant management
 * 4. Create product variant with specific inventory settings
 * 5. Retrieve and validate variant inventory data including stock levels,
 *    policies, and availability
 */
export async function test_api_product_variant_inventory_tracking(
  connection: api.IConnection,
) {
  // 1. Create seller account with proper authentication
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        business_name: RandomGenerator.name(),
        business_registration_number: RandomGenerator.alphabets(10),
        tax_id: RandomGenerator.alphabets(9),
        phone: RandomGenerator.mobile(),
        business_type: RandomGenerator.pick([
          "sole proprietorship",
          "corporation",
          "limited liability company",
        ]),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Create product with inventory tracking enabled
  const productData = {
    sku: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<10>>(),
    condition: "new",
    weight: typia.random<number & tags.Minimum<1> & tags.Maximum<10>>(),
    weight_unit: "kg",
    track_quantity: true,
    allow_backorder: true,
    is_shipping_required: true,
    is_taxable: true,
    category_id: seller.id, // Using seller ID as a valid UUID reference
    shopping_mall_seller_id: seller.id,
    href: "https://test-shopping-mall.com/products",
    referrer: "https://test-shopping-mall.com/dashboard",
    variants: [],
    images: [],
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  // 3. Configure product units for variant management
  const unitSetups: IShoppingMallProductUnit.ICreate[] = [
    {
      name: "Size",
      type: "size",
      display_style: "buttons",
      is_required: true,
      is_multiple: false,
      sort_order: 1,
    },
    {
      name: "Color",
      type: "color",
      display_style: "swatches",
      is_required: true,
      is_multiple: false,
      sort_order: 2,
    },
  ];

  const createdUnits: IShoppingMallProductUnit[] = [];
  for (const unitSetup of unitSetups) {
    const unit: IShoppingMallProductUnit =
      await api.functional.shoppingMall.seller.products.units.create(
        connection,
        {
          productCode: product.sku,
          body: unitSetup,
        },
      );
    typia.assert(unit);
    createdUnits.push(unit);
  }

  const sizeUnit = createdUnits.find((u) => u.name === "Size");
  const colorUnit = createdUnits.find((u) => u.name === "Color");

  if (!sizeUnit || !colorUnit) {
    throw new Error("Product units not properly created");
  }

  // 4. Create multiple product variants with different inventory settings
  const variants: IShoppingMallProductVariant[] = [];

  // Variant 1: Standard inventory with deny policy
  const variant1Sku: string = `${product.sku}-M-BLUE`;
  const variant1: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: variant1Sku,
          title: "Medium, Navy Blue",
          price_adjustment: 0,
          inventory_quantity: 25,
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  variants.push(variant1);

  // Variant 2: Low stock with continue policy (allows backorders)
  const variant2Sku: string = `${product.sku}-L-RED`;
  const variant2: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: colorUnit.id,
          sku: variant2Sku,
          title: "Large, Red",
          price_adjustment: 5.0,
          inventory_quantity: 2,
          inventory_policy: "continue",
          position: 2,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  variants.push(variant2);

  // Variant 3: Out of stock with continue policy
  const variant3Sku: string = `${product.sku}-XL-GREEN`;
  const variant3: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: variant3Sku,
          title: "Extra Large, Green",
          price_adjustment: -3.0,
          inventory_quantity: 0,
          inventory_policy: "continue",
          position: 3,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant3);
  variants.push(variant3);

  // 5. Retrieve and validate variant inventory data for comprehensive testing

  // Test Variant 1: Standard inventory with deny policy
  const retrievedVariant1: IShoppingMallProductVariant =
    await api.functional.shoppingMall.products.variants.at(connection, {
      productCode: product.sku,
      variantCode: variant1Sku,
    });
  typia.assert(retrievedVariant1);

  TestValidator.equals(
    "variant1 ID matches",
    retrievedVariant1.id,
    variant1.id,
  );
  TestValidator.equals(
    "variant1 SKU matches",
    retrievedVariant1.sku,
    variant1Sku,
  );
  TestValidator.equals(
    "variant1 title matches",
    retrievedVariant1.title,
    "Medium, Navy Blue",
  );
  TestValidator.equals(
    "variant1 inventory matches",
    retrievedVariant1.inventory_quantity,
    25,
  );
  TestValidator.equals(
    "variant1 policy is deny",
    retrievedVariant1.inventory_policy,
    "deny",
  );
  TestValidator.equals(
    "variant1 has stock available",
    retrievedVariant1.inventory_quantity > 0,
    true,
  );

  // Test Variant 2: Low stock with continue policy
  const retrievedVariant2: IShoppingMallProductVariant =
    await api.functional.shoppingMall.products.variants.at(connection, {
      productCode: product.sku,
      variantCode: variant2Sku,
    });
  typia.assert(retrievedVariant2);

  TestValidator.equals(
    "variant2 ID matches",
    retrievedVariant2.id,
    variant2.id,
  );
  TestValidator.equals(
    "variant2 SKU matches",
    retrievedVariant2.sku,
    variant2Sku,
  );
  TestValidator.equals(
    "variant2 title matches",
    retrievedVariant2.title,
    "Large, Red",
  );
  TestValidator.equals(
    "variant2 inventory matches",
    retrievedVariant2.inventory_quantity,
    2,
  );
  TestValidator.equals(
    "variant2 policy is continue",
    retrievedVariant2.inventory_policy,
    "continue",
  );
  TestValidator.equals(
    "variant2 price adjustment positive",
    retrievedVariant2.price_adjustment,
    5.0,
  );
  TestValidator.predicate(
    "variant2 has low stock warning",
    retrievedVariant2.inventory_quantity <= 5,
  );

  // Test Variant 3: Out of stock with continue policy
  const retrievedVariant3: IShoppingMallProductVariant =
    await api.functional.shoppingMall.products.variants.at(connection, {
      productCode: product.sku,
      variantCode: variant3Sku,
    });
  typia.assert(retrievedVariant3);

  TestValidator.equals(
    "variant3 ID matches",
    retrievedVariant3.id,
    variant3.id,
  );
  TestValidator.equals(
    "variant3 SKU matches",
    retrievedVariant3.sku,
    variant3Sku,
  );
  TestValidator.equals(
    "variant3 title matches",
    retrievedVariant3.title,
    "Extra Large, Green",
  );
  TestValidator.equals(
    "variant3 inventory is zero",
    retrievedVariant3.inventory_quantity,
    0,
  );
  TestValidator.equals(
    "variant3 policy is continue",
    retrievedVariant3.inventory_policy,
    "continue",
  );
  TestValidator.equals(
    "variant3 price adjustment negative",
    retrievedVariant3.price_adjustment,
    -3.0,
  );
  TestValidator.equals(
    "variant3 allows backorder",
    retrievedVariant3.inventory_policy === "continue" &&
      retrievedVariant3.inventory_quantity === 0,
    true,
  );

  // Comprehensive inventory tracking validation
  TestValidator.predicate(
    "all variants have correct product relationship",
    retrievedVariant1.shopping_mall_product_id === product.id &&
      retrievedVariant2.shopping_mall_product_id === product.id &&
      retrievedVariant3.shopping_mall_product_id === product.id,
  );

  TestValidator.predicate(
    "inventory quantities are non-negative",
    retrievedVariant1.inventory_quantity >= 0 &&
      retrievedVariant2.inventory_quantity >= 0 &&
      retrievedVariant3.inventory_quantity >= 0,
  );

  TestValidator.predicate(
    "position values are correctly ordered",
    retrievedVariant1.position < retrievedVariant2.position &&
      retrievedVariant2.position < retrievedVariant3.position,
  );

  TestValidator.predicate(
    "all variants are active for customer visibility",
    retrievedVariant1.is_active &&
      retrievedVariant2.is_active &&
      retrievedVariant3.is_active,
  );

  TestValidator.predicate(
    "inventory policies are valid",
    (retrievedVariant1.inventory_policy === "deny" ||
      retrievedVariant1.inventory_policy === "continue") &&
      (retrievedVariant2.inventory_policy === "deny" ||
        retrievedVariant2.inventory_policy === "continue") &&
      (retrievedVariant3.inventory_policy === "deny" ||
        retrievedVariant3.inventory_policy === "continue"),
  );
}
