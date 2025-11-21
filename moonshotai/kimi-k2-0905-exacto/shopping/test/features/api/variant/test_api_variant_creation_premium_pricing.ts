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
 * Test creation of premium product variants with higher pricing configurations
 * for value-added attributes including premium materials, enhanced features,
 * and upgraded specifications. Validates accurate price adjustment calculations
 * for premium configurations, proper cost tracking for margin analysis, and
 * competitive positioning within premium market segments while maintaining
 * clear value proposition communication to customers and supporting
 * sophisticated pricing strategies for different market segments and customer
 * value perceptions across premium marketplace offerings.
 */
export async function test_api_variant_creation_premium_pricing(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for premium product creation
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "corporation",
        "llc",
        "partnership",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create base product foundation for premium variant development
  const baseProduct = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `PREMIUM-${RandomGenerator.alphaNumeric(8)}`,
        name: `${RandomGenerator.name()} Premium Product`,
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
        price: typia.random<number & tags.Minimum<500> & tags.Maximum<2000>>(),
        compare_at_price: typia.random<
          number & tags.Minimum<800> & tags.Maximum<3000>
        >(),
        cost: typia.random<number & tags.Minimum<200> & tags.Maximum<800>>(),
        condition: "new",
        weight: typia.random<
          number & tags.Type<"float"> & tags.Minimum<1> & tags.Maximum<50>
        >(),
        weight_unit: "kg",
        barcode: RandomGenerator.alphaNumeric(12),
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: RandomGenerator.name(4),
        seo_description: RandomGenerator.paragraph({ sentences: 5 }),
        tags: "premium, luxury, high-end",
        featured_image: "https://example.com/premium-product.jpg",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/seller/dashboard/products/create",
        referrer: "https://example.com/seller/dashboard/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(baseProduct);

  // Step 3: Configure premium feature selection unit for value-added variant identification
  const premiumUnitData = [
    {
      name: "Material Quality",
      type: "material",
      display_style: "buttons",
      is_required: true,
      is_multiple: false,
      sort_order: 1,
    },
    {
      name: "Premium Features",
      type: "custom",
      display_style: "dropdown",
      is_required: true,
      is_multiple: false,
      sort_order: 2,
    },
    {
      name: "Enhancement Package",
      type: "style",
      display_style: "dropdown",
      is_required: true,
      is_multiple: false,
      sort_order: 3,
    },
  ] as const;

  const premiumUnits = await ArrayUtil.asyncRepeat(
    premiumUnitData.length,
    async (index) => {
      const unitData = premiumUnitData[index];
      const unit =
        await api.functional.shoppingMall.seller.products.units.create(
          connection,
          {
            productCode: baseProduct.sku,
            body: {
              name: unitData.name,
              type: unitData.type,
              display_style: unitData.display_style,
              is_required: unitData.is_required,
              is_multiple: unitData.is_multiple,
              sort_order: unitData.sort_order,
            } satisfies IShoppingMallProductUnit.ICreate,
          },
        );
      return unit;
    },
  );

  // Step 4: Create premium variants with sophisticated pricing adjustments
  const premiumVariants = [
    {
      unitIndex: 0,
      sku: `PREMIUM-LUXE-${RandomGenerator.alphaNumeric(6)}`,
      title: "Luxury Edition, Premium Materials, Ultimate Performance",
      price_adjustment: 750.0,
      cost_adjustment: 300.0,
      weight_adjustment: 2.5,
      inventory_quantity: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<200>
      >(),
      inventory_policy: "deny" as const,
      is_active: true,
    },
    {
      unitIndex: 1,
      sku: `PREMIUM-ELITE-${RandomGenerator.alphaNumeric(6)}`,
      title: "Elite Package, Advanced Features, Professional Grade",
      price_adjustment: 1200.0,
      cost_adjustment: 450.0,
      weight_adjustment: 3.2,
      inventory_quantity: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<25> & tags.Maximum<100>
      >(),
      inventory_policy: "continue" as const,
      is_active: true,
    },
    {
      unitIndex: 2,
      sku: `PREMIUM-EXECUTIVE-${RandomGenerator.alphaNumeric(6)}`,
      title: "Executive Suite, Maximum Enhancement, Premium Selection",
      price_adjustment: 1800.0,
      cost_adjustment: 650.0,
      weight_adjustment: 4.5,
      inventory_quantity: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<75>
      >(),
      inventory_policy: "deny" as const,
      is_active: true,
    },
  ] as const;

  const createdVariants = await ArrayUtil.asyncRepeat(
    premiumVariants.length,
    async (index) => {
      const variantData = premiumVariants[index];
      const associatedUnit = premiumUnits[variantData.unitIndex];

      const variant =
        await api.functional.shoppingMall.seller.products.variants.create(
          connection,
          {
            productCode: baseProduct.sku,
            body: {
              shopping_mall_product_id: baseProduct.id,
              shopping_mall_product_unit_id: associatedUnit.id,
              sku: variantData.sku,
              title: variantData.title,
              price_adjustment: variantData.price_adjustment,
              cost_adjustment: variantData.cost_adjustment,
              weight_adjustment: variantData.weight_adjustment,
              barcode: RandomGenerator.alphaNumeric(13),
              inventory_quantity: variantData.inventory_quantity,
              inventory_policy: variantData.inventory_policy,
              is_active: variantData.is_active,
              position: index,
            } satisfies IShoppingMallProductVariant.ICreate,
          },
        );
      return variant;
    },
  );

  // Step 5: Validate premium pricing calculations and business logic
  createdVariants.forEach((variant, index) => {
    TestValidator.predicate(
      `variant ${index} price adjustment should be positive for premium variant`,
      variant.price_adjustment > 0,
    );

    TestValidator.predicate(
      `variant ${index} cost adjustment should be positive for premium variant`,
      variant.cost_adjustment !== null && variant.cost_adjustment !== undefined
        ? variant.cost_adjustment > 0
        : false,
    );

    TestValidator.predicate(
      `variant ${index} should have sufficient inventory for premium product`,
      variant.inventory_quantity > 20,
    );

    TestValidator.predicate(
      `variant ${index} should be active for premium positioning`,
      variant.is_active === true,
    );

    TestValidator.equals(
      `variant ${index} product relationship should be correct`,
      variant.shopping_mall_product_id,
      baseProduct.id,
    );
  });

  // Step 6: Validate competitive positioning and value proposition
  TestValidator.predicate(
    "premium variants should be created with ascending price adjustments",
    createdVariants[1].price_adjustment > createdVariants[0].price_adjustment &&
      createdVariants[2].price_adjustment > createdVariants[1].price_adjustment,
  );

  TestValidator.predicate(
    "premium variants should have corresponding cost increases",
    (createdVariants[0].cost_adjustment || 0) <
      (createdVariants[1].cost_adjustment || 0) &&
      (createdVariants[1].cost_adjustment || 0) <
        (createdVariants[2].cost_adjustment || 0),
  );

  // Step 7: Validate SKU uniqueness across variants
  const variantSkus = createdVariants.map((v) => v.sku);
  TestValidator.equals(
    "variant SKUs should be unique across premium variants",
    new Set(variantSkus).size,
    variantSkus.length,
  );
}
