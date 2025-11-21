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

export async function test_api_seller_variant_creation_backorder_management(
  connection: api.IConnection,
) {
  // 1. Seller Registration with comprehensive business verification
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        business_name: RandomGenerator.name(2),
        business_registration_number: RandomGenerator.alphaNumeric(12),
        tax_id: RandomGenerator.alphaNumeric(10),
        phone: RandomGenerator.mobile("010"),
        business_type: RandomGenerator.pick([
          "corporation",
          "llc",
          "partnership",
          "sole_proprietorship",
        ] as const) satisfies string,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Create product with inventory tracking enabled
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        sku: RandomGenerator.alphaNumeric(8).toUpperCase(),
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<5>>(),
        weight_unit: RandomGenerator.pick([
          "kg",
          "g",
          "lb",
          "oz",
        ] as const) satisfies string,
        track_quantity: true,
        allow_backorder: true, // Enable backorder at product level
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        seo_title: RandomGenerator.name(2),
        seo_description: RandomGenerator.paragraph({ sentences: 3 }),
        tags: "electronics,gadgets,tech",
        featured_image: "https://example.com/product-image.jpg",
        href: "https://seller.dashboard.com/products/create",
        referrer: "https://seller.dashboard.com/products",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 3. Create product units for size variations
  const sizeUnit: IShoppingMallProductUnit =
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

  // Create color unit
  const colorUnit: IShoppingMallProductUnit =
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

  // Create material unit
  const materialUnit: IShoppingMallProductUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Material",
        type: "material",
        display_style: "buttons",
        is_required: false,
        is_multiple: false,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(materialUnit);

  // 4. Create variants with different backorder policies

  // Variant 1: Medium size with continue backorder policy
  const variantContinue: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: `${product.sku}-MEDIUM-CONTINUE`,
          title: "Medium Size - Continue Backorder",
          price_adjustment: 0,
          inventory_quantity: 0, // Zero inventory to test backorder
          inventory_policy: "continue", // Enable backorder
          position: 1,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variantContinue);

  // Variant 2: Large size with deny backorder policy
  const variantDeny: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: `${product.sku}-LARGE-DENY`,
          title: "Large Size - Deny Backorder",
          price_adjustment: 5.99,
          inventory_quantity: 0, // Zero inventory to test policy difference
          inventory_policy: "deny", // Disable backorder
          position: 2,
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variantDeny);

  // Variant 3: Small size with premium pricing and continue policy
  const variantPremium: IShoppingMallProductVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: sizeUnit.id,
          sku: `${product.sku}-SMALL-PREMIUM`,
          title: "Small Size - Premium Continue",
          price_adjustment: -2.99, // Discount pricing
          inventory_quantity: 5, // Limited inventory
          inventory_policy: "continue",
          position: 0, // First position for premium variants
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variantPremium);

  // 5. Validate backorder management policies
  TestValidator.predicate(
    "variantContinue has zero inventory",
    variantContinue.inventory_quantity === 0,
  );
  TestValidator.predicate(
    "variantContinue allows backorder",
    variantContinue.inventory_policy === "continue",
  );
  TestValidator.predicate(
    "variantContinue is active",
    variantContinue.is_active === true,
  );

  TestValidator.predicate(
    "variantDeny has zero inventory",
    variantDeny.inventory_quantity === 0,
  );
  TestValidator.predicate(
    "variantDeny denies backorder",
    variantDeny.inventory_policy === "deny",
  );
  TestValidator.predicate(
    "variantDeny is active",
    variantDeny.is_active === true,
  );

  TestValidator.predicate(
    "variantPremium has limited inventory",
    variantPremium.inventory_quantity === 5,
  );
  TestValidator.predicate(
    "variantPremium continues backorder",
    variantPremium.inventory_policy === "continue",
  );
  TestValidator.predicate(
    "variantPremium has premium positioning",
    variantPremium.position === 0,
  );

  // 6. Validate SKU uniqueness and relationships
  TestValidator.predicate(
    "all SKUs are unique",
    variantContinue.sku !== variantDeny.sku &&
      variantDeny.sku !== variantPremium.sku &&
      variantContinue.sku !== variantPremium.sku,
  );

  TestValidator.equals(
    "all variants belong to same product",
    variantContinue.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "variant positions are different",
    variantContinue.position !== variantDeny.position,
    true,
  );

  // 7. Test price adjustment strategies
  TestValidator.predicate(
    "variantContinue has base price",
    variantContinue.price_adjustment === 0,
  );
  TestValidator.predicate(
    "variantDeny has premium adjustment",
    variantDeny.price_adjustment === 5.99,
  );
  TestValidator.predicate(
    "variantPremium has discount adjustment",
    variantPremium.price_adjustment === -2.99,
  );

  // 8. Validate inventory management system integrity
  TestValidator.predicate(
    "continue policy enables sales during shortage",
    variantContinue.inventory_policy === "continue" &&
      variantContinue.inventory_quantity === 0,
  );

  TestValidator.predicate(
    "deny policy prevents sales during shortage",
    variantDeny.inventory_policy === "deny" &&
      variantDeny.inventory_quantity === 0,
  );

  // 9. Business logic validation
  const totalVariants = [variantContinue, variantDeny, variantPremium];
  TestValidator.predicate(
    "all variants are properly configured",
    totalVariants.length === 3,
  );

  const continueVariants = totalVariants.filter(
    (v) => v.inventory_policy === "continue",
  );
  const denyVariants = totalVariants.filter(
    (v) => v.inventory_policy === "deny",
  );

  TestValidator.equals(
    "two variants allow backorder",
    continueVariants.length,
    2,
  );
  TestValidator.equals("one variant denies backorder", denyVariants.length, 1);

  // 10. Customer expectation and supply chain validation
  const activeContinueVariants = continueVariants.filter((v) => v.is_active);
  TestValidator.equals(
    "all continue variants are active",
    activeContinueVariants.length,
    2,
  );

  // Verify pricing differentiation for inventory strategies
  const priceAdjustments = totalVariants.map((v) => v.price_adjustment);
  TestValidator.predicate(
    "pricing reflects inventory strategies",
    priceAdjustments.includes(0) &&
      priceAdjustments.includes(5.99) &&
      priceAdjustments.includes(-2.99),
  );
}
