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

export async function test_api_seller_variant_creation_unit_integration(
  connection: api.IConnection,
) {
  // 1. Create seller account for authentication and product management
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphabets(12),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "corporation",
        "llc",
        "partnership",
        "sole_proprietorship",
      ]),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Create base product for variant configuration
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `PROD-${RandomGenerator.alphaNumeric(8)}`,
        name: `${RandomGenerator.name()} ${RandomGenerator.name()} Premium Shirt`,
        description: RandomGenerator.content({ paragraphs: 3 }),
        price: typia.random<number & tags.Minimum<50> & tags.Maximum<200>>(),
        condition: "new",
        weight: 0.5,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://example.com/dashboard/products/create",
        referrer: "https://example.com/dashboard/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Create comprehensive product units for variant configuration
  // Size unit using button display
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
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

  // Color unit using swatch display
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

  // Material unit using dropdown display
  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: "Material",
        type: "material",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(materialUnit);

  // 4. Create product variants demonstrating different pricing strategies
  const variantData = [
    {
      sku: `${product.sku}-SM-BLK-CTN`,
      title: "Small, Black, Cotton Blend",
      priceAdjustment: 0, // Standard pricing
      inventory: typia.random<number & tags.Type<"int32"> & tags.Minimum<10>>(),
      policy: "deny" as const,
      position: 1,
      isActive: true,
      hasBarcode: false,
    },
    {
      sku: `${product.sku}-MD-NVY-PREMIUM`,
      title: "Medium, Navy, Premium Cotton",
      priceAdjustment: 12, // Premium upcharge
      inventory: typia.random<number & tags.Type<"int32"> & tags.Minimum<15>>(),
      policy: "deny" as const,
      position: 2,
      isActive: true,
      hasBarcode: true,
    },
    {
      sku: `${product.sku}-LG-GRN-BASIC`,
      title: "Large, Forest Green, Basic",
      priceAdjustment: -8, // Discount tier
      costAdjustment: -5,
      weightAdjustment: 0.05,
      inventory: typia.random<number & tags.Type<"int32"> & tags.Minimum<25>>(),
      policy: "continue" as const, // Allow backorders
      position: 3,
      isActive: true,
      hasBarcode: false,
    },
    {
      sku: `${product.sku}-XL-BLK-LUXURY`,
      title: "Extra Large, Black, Luxury Blend",
      priceAdjustment: 25, // Luxury premium
      costAdjustment: 18,
      weightAdjustment: 0.15,
      inventory: typia.random<number & tags.Type<"int32"> & tags.Minimum<5>>(),
      policy: "deny" as const,
      position: 4,
      isActive: true,
      hasBarcode: true,
    },
  ];

  // Create variants and validate configuration
  const createdVariants: IShoppingMallProductVariant[] = [];

  for (let i = 0; i < variantData.length; i++) {
    const variant = variantData[i];
    const createdVariant =
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productCode: product.sku,
          body: {
            shopping_mall_product_id: product.id,
            shopping_mall_product_unit_id: sizeUnit.id, // Using size unit as primary unit reference
            sku: variant.sku,
            title: variant.title,
            price_adjustment: variant.priceAdjustment,
            cost_adjustment: variant.hasBarcode
              ? variant.costAdjustment
              : undefined,
            weight_adjustment: variant.hasBarcode
              ? variant.weightAdjustment
              : undefined,
            barcode: variant.hasBarcode
              ? `BAR-${RandomGenerator.alphaNumeric(8)}`
              : undefined,
            image: variant.hasBarcode
              ? `https://images.example.com/products/${variant.sku}.jpg`
              : undefined,
            inventory_quantity: variant.inventory,
            inventory_policy: variant.policy,
            position: variant.position,
            is_active: variant.isActive,
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    typia.assert(createdVariant);
    createdVariants.push(createdVariant);
  }

  // 5. Validate variant creation and business relationships
  TestValidator.equals(
    "variant count matches expected",
    createdVariants.length,
    variantData.length,
  );
  TestValidator.predicate("all variants linked to parent product", () =>
    createdVariants.every(
      (variant) => variant.shopping_mall_product_id === product.id,
    ),
  );

  // Verify SKU uniqueness enforcement
  const createdSKUs = createdVariants.map((v) => v.sku);
  TestValidator.predicate(
    "SKU uniqueness maintained",
    () => new Set(createdSKUs).size === createdSKUs.length,
  );

  // Validate pricing strategy implementations
  TestValidator.equals(
    "standard variant pricing",
    createdVariants[0].price_adjustment,
    0,
  );
  TestValidator.equals(
    "premium variant pricing",
    createdVariants[1].price_adjustment,
    12,
  );
  TestValidator.equals(
    "discount tier pricing",
    createdVariants[2].price_adjustment,
    -8,
  );
  TestValidator.equals(
    "luxury premium pricing",
    createdVariants[3].price_adjustment,
    25,
  );

  // Validate inventory policies
  TestValidator.equals(
    "standard inventory policy",
    createdVariants[0].inventory_policy,
    "deny",
  );
  TestValidator.equals(
    "discount tier allows backorders",
    createdVariants[2].inventory_policy,
    "continue",
  );

  // Verify cost and weight tracking for complex variants
  TestValidator.predicate(
    "luxury variant has cost adjustment",
    () => createdVariants[3].cost_adjustment !== undefined,
  );
  TestValidator.predicate(
    "basic variant simplified",
    () => createdVariants[0].cost_adjustment === undefined,
  );

  // 6. Test error scenarios for variant configuration
  await TestValidator.error(
    "duplicate SKU variant creation should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productCode: product.sku,
          body: {
            shopping_mall_product_id: product.id,
            shopping_mall_product_unit_id: sizeUnit.id,
            sku: createdVariants[0].sku, // Duplicate SKU
            title: "Duplicate Test Variant",
            price_adjustment: 0,
            inventory_quantity: 50,
            inventory_policy: "deny",
            position: 99,
            is_active: true,
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    },
  );

  await TestValidator.error(
    "invalid inventory policy should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productCode: product.sku,
          body: {
            shopping_mall_product_id: product.id,
            shopping_mall_product_unit_id: sizeUnit.id,
            sku: `${product.sku}-ERROR-TEST`,
            title: "Error Test Variant",
            price_adjustment: 0,
            inventory_quantity: 50,
            inventory_policy: "invalid_policy" as any, // Invalid enum value
            position: 100,
            is_active: true,
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    },
  );
}
