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
 * Test retrieval of premium product variants with price adjustments and special
 * configurations. Validates accurate pricing display, cost tracking, weight
 * adjustments for shipping, and enhanced variant features. Ensures complex
 * variant properties are properly surfaced for informed customer purchasing
 * decisions.
 *
 * Steps:
 *
 * 1. Register seller account for premium product creation
 * 2. Create premium product with comprehensive pricing and configuration data
 * 3. Configure product units for size and color variations
 * 4. Create premium variant mapping multiple unit configurations
 * 5. Retrieve and validate variant details including pricing, cost, weight
 *    adjustments
 */
export async function test_api_product_variant_retrieval_premium_config(
  connection: api.IConnection,
) {
  // 1. Register seller account for premium product creation
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        business_name: RandomGenerator.name(2),
        business_registration_number: RandomGenerator.alphabets(10),
        tax_id: RandomGenerator.alphabets(12),
        phone: RandomGenerator.mobile(),
        business_type: RandomGenerator.pick([
          "corporation",
          "limited_liability_company",
          "sole_proprietorship",
        ]),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Create premium product with comprehensive pricing and configuration data
  const productSKU = `PRM-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: productSKU,
        name: `Premium ${RandomGenerator.name(2)} Product`,
        description: `Premium product description: ${RandomGenerator.content({ paragraphs: 2, sentenceMin: 10, sentenceMax: 20 })}`,
        price: 199.99,
        compare_at_price: 299.99,
        cost: 120.5,
        condition: "new",
        weight: 2.5,
        weight_unit: "kg",
        barcode: `${RandomGenerator.alphabets(3)}${typia.random<number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<9999>>()}`,
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: `Premium ${RandomGenerator.name()} - High Quality Solution`,
        seo_description: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 4,
          wordMax: 8,
        }),
        tags: `${RandomGenerator.name()},premium,high-quality,${RandomGenerator.alphabets(5)}`,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: `https://marketplace.example.com/seller/products/create`,
        referrer: `https://marketplace.example.com/seller/dashboard`,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 3. Configure product units for size and color variations
  const sizeUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: productSKU,
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

  const colorUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: productSKU,
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

  // 4. Create premium variant with comprehensive configuration adjustments
  // Create a variant representing "Large, Premium Blue" by using the size unit
  const variantSKU = `VAR-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const variant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: productSKU,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: variantSKU,
          title: "Large, Premium Blue (Size + Premium Configuration)",
          price_adjustment: 49.99, // Premium price increase
          cost_adjustment: 25.5, // Higher material cost
          weight_adjustment: 0.8, // Additional weight for premium materials
          barcode: `${RandomGenerator.alphabets(3)}${typia.random<number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<9999>>()}`,
          image: `https://cdn.marketplace.example.com/products/${product.id}/variants/large-blue.jpg`,
          inventory_quantity: 25,
          inventory_policy: "deny",
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);

  // 5. Retrieve and validate variant details
  const retrievedVariant: IShoppingMallProductVariant =
    await api.functional.shoppingMall.products.variants.at(connection, {
      productCode: productSKU,
      variantCode: variantSKU,
    });
  typia.assert(retrievedVariant);

  // Validate variant properties
  TestValidator.equals("variant ID matches", retrievedVariant.id, variant.id);
  TestValidator.equals("variant SKU matches", retrievedVariant.sku, variantSKU);
  TestValidator.equals(
    "variant title matches",
    retrievedVariant.title,
    "Large, Premium Blue (Size + Premium Configuration)",
  );
  TestValidator.equals(
    "price adjustment correct",
    retrievedVariant.price_adjustment,
    49.99,
  );
  TestValidator.equals(
    "cost adjustment matches",
    retrievedVariant.cost_adjustment,
    25.5,
  );
  TestValidator.equals(
    "weight adjustment accurate",
    retrievedVariant.weight_adjustment,
    0.8,
  );
  TestValidator.equals(
    "inventory quantity correct",
    retrievedVariant.inventory_quantity,
    25,
  );
  TestValidator.equals(
    "inventory policy set",
    retrievedVariant.inventory_policy,
    "deny",
  );
  TestValidator.equals("position correctly set", retrievedVariant.position, 1);
  TestValidator.equals("variant is active", retrievedVariant.is_active, true);
  TestValidator.predicate(
    "variant has barcode",
    retrievedVariant.barcode !== null && retrievedVariant.barcode !== undefined,
  );
  TestValidator.predicate(
    "variant has image URL",
    retrievedVariant.image !== null && retrievedVariant.image !== undefined,
  );

  // Validate product relationships
  TestValidator.equals(
    "parent product ID matches",
    retrievedVariant.shopping_mall_product_id,
    product.id,
  );
  TestValidator.predicate(
    "parent unit ID is valid",
    retrievedVariant.shopping_mall_product_unit_id === sizeUnit.id ||
      retrievedVariant.shopping_mall_product_unit_id === colorUnit.id,
  );

  // Validate premium pricing scenarios
  TestValidator.predicate(
    "price adjustment is positive premium amount",
    retrievedVariant.price_adjustment > 45 &&
      retrievedVariant.price_adjustment < 55,
  );
  TestValidator.predicate(
    "cost adjustment reflects premium materials",
    (retrievedVariant.cost_adjustment || 0) > 20 &&
      (retrievedVariant.cost_adjustment || 0) < 30,
  );
  TestValidator.predicate(
    "weight adjustment accounts for premium features",
    (retrievedVariant.weight_adjustment || 0) > 0.5 &&
      (retrievedVariant.weight_adjustment || 0) < 1.0,
  );
}
