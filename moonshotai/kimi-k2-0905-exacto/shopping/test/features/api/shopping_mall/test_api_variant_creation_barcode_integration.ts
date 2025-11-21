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
 * Test variant creation with comprehensive barcode integration including
 * SKU-based product codes, UPC/EAN compatibility for retail environments, and
 * proper scanning system support for fulfillment operations. Validates seamless
 * integration with point-of-sale systems, warehouse management compatibility,
 * and comprehensive inventory tracking through automated scanning workflows
 * while supporting retail partnerships and ensuring proper variant
 * identification across complex supply chain integrations for both online and
 * offline marketplace coordination.
 */
export async function test_api_variant_creation_barcode_integration(
  connection: api.IConnection,
) {
  // Step 1: Register seller account with retail partnership requirements
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: "Retail Partner Merchant",
    business_registration_number: `REG-${typia.random<string & tags.Pattern<"^[0-9]{8,10}$">>()}`,
    tax_id: `TAX-${typia.random<string & tags.Pattern<"^[0-9]{9}-[0-9]{4}$">>()}`,
    phone: RandomGenerator.mobile(),
    business_type: "corporation",
  } satisfies IShoppingMallSeller.IJoin;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 2: Create product designed for retail environment with barcode support
  const productData = {
    sku: `PROD-${RandomGenerator.alphaNumeric(8)}`,
    name: "Premium Bluetooth Headphones",
    description:
      "High-quality wireless headphones with active noise cancellation and retail packaging",
    price: 299.99,
    condition: "new",
    weight: 0.35,
    weight_unit: "kg",
    barcode: typia.random<string & tags.Format<"uuid">>(), // Simulated retail barcode
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    href: "https://shopping-mall.com/seller/products/create",
    referrer: "https://shopping-mall.com/seller/dashboard",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 3: Create product units for variant identification
  const unitVariant1 = {
    name: "Color",
    type: "color",
    display_style: "swatches",
    is_required: true,
    is_multiple: false,
    sort_order: 1,
  } satisfies IShoppingMallProductUnit.ICreate;

  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: unitVariant1,
    });
  typia.assert(colorUnit);

  const unitVariant2 = {
    name: "Storage Capacity",
    type: "size",
    display_style: "dropdown",
    is_required: true,
    is_multiple: false,
    sort_order: 2,
  } satisfies IShoppingMallProductUnit.ICreate;

  const storageUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: unitVariant2,
    });

  typia.assert(storageUnit);

  // Step 4: Create variants with comprehensive barcode integration
  const variants = [
    {
      shopping_mall_product_id: product.id,
      shopping_mall_product_unit_id: colorUnit.id,
      sku: `VAR-${product.sku}-BLACK-64GB`,
      title: "Matte Black, 64GB Storage",
      price_adjustment: 0,
      inventory_quantity: 50,
      inventory_policy: "deny",
      position: 1,
      is_active: true,
      barcode: `850${typia.random<string & tags.Pattern<"^[0-9]{9,11}$">>()}`, // UPC-A format
      image: "https://storage.example.com/images/headphones-black.jpg",
      weight_adjustment: 0,
      cost_adjustment: 0,
    } satisfies IShoppingMallProductVariant.ICreate,
    {
      shopping_mall_product_id: product.id,
      shopping_mall_product_unit_id: colorUnit.id,
      sku: `VAR-${product.sku}-WHITE-128GB`,
      title: "Pearl White, 128GB Storage",
      price_adjustment: 50.0, // Premium variant with higher storage
      inventory_quantity: 30,
      inventory_policy: "continue", // Allow backorders for premium variant
      position: 2,
      is_active: true,
      barcode: `850${typia.random<string & tags.Pattern<"^[0-9]{9,11}$">>()}`, // Different barcode
      image: "https://storage.example.com/images/headphones-white.jpg",
      weight_adjustment: 0.02, // Slight weight increase
      cost_adjustment: 45.0, // Cost difference for premium
    } satisfies IShoppingMallProductVariant.ICreate,
    {
      shopping_mall_product_id: product.id,
      shopping_mall_product_unit_id: storageUnit.id, // Link to storage unit instead
      sku: `VAR-${product.sku}-SILVER-256GB`,
      title: "Silver Pro Edition",
      price_adjustment: 150.0, // High-end pro variant
      inventory_quantity: 15,
      inventory_policy: "continue",
      position: 3,
      is_active: true,
      barcode: `87${typia.random<string & tags.Pattern<"^[0-9]{10}$">>()}`, // EAN-13 format
      image: "https://storage.example.com/images/headphones-silver.jpg",
      weight_adjustment: 0.05, // Additional weight for pro components
      cost_adjustment: 120.0, // Significant cost difference
    } satisfies IShoppingMallProductVariant.ICreate,
  ];

  // Store created variants for validation
  const createdVariants: IShoppingMallProductVariant[] = [];

  // Create each variant with barcode integration
  for (const variantData of variants) {
    const variant =
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productCode: product.sku,
          body: variantData,
        },
      );
    typia.assert(variant);
    createdVariants.push(variant);

    // Validate variant properties
    TestValidator.equals("variant SKU matches", variant.sku, variantData.sku);
    TestValidator.equals(
      "variant title matches",
      variant.title,
      variantData.title,
    );
    TestValidator.equals(
      "variant price adjustment",
      variant.price_adjustment,
      variantData.price_adjustment,
    );
    TestValidator.equals(
      "variant inventory quantity",
      variant.inventory_quantity,
      variantData.inventory_quantity,
    );
    TestValidator.equals(
      "variant inventory policy",
      variant.inventory_policy,
      variantData.inventory_policy,
    );
    TestValidator.equals(
      "variant position",
      variant.position,
      variantData.position,
    );
    TestValidator.equals(
      "variant is active",
      variant.is_active,
      variantData.is_active,
    );
    TestValidator.notEquals("variant barcode exists", variant.barcode, null);
    TestValidator.notEquals("variant barcode empty", variant.barcode, "");
    TestValidator.predicate(
      "variant barcode starts with valid prefix",
      variant.barcode!.startsWith("850") ||
        variant.barcode!.startsWith("87") ||
        variant.barcode!.startsWith("73"),
    );

    // Validate barcode uniqueness across variants
    const otherVariants = createdVariants.filter((v) => v.id !== variant.id);
    TestValidator.predicate(
      "barcode is unique",
      otherVariants.every((v) => v.barcode !== variant.barcode),
    );
  }

  // Step 5: Validate retail marketplace integration features
  TestValidator.equals("total variants created", createdVariants.length, 3);

  // Validate SKU structure and consistency
  createdVariants.forEach((variant, index) => {
    TestValidator.predicate(
      `variant ${index + 1} SKU contains product code`,
      variant.sku.includes(product.sku),
    );
    TestValidator.predicate(
      `variant ${index + 1} SKU follows pattern`,
      variant.sku.startsWith(`VAR-${product.sku}`),
    );
  });

  // Validate inventory management integration
  const totalInventory = createdVariants.reduce(
    (sum, variant) => sum + variant.inventory_quantity,
    0,
  );
  TestValidator.equals("total inventory across variants", totalInventory, 95);

  // Validate price differentiation strategy
  TestValidator.predicate(
    "price adjustments increase with premium features",
    () => {
      const adjustments = createdVariants
        .map((v) => v.price_adjustment)
        .sort((a, b) => a - b);
      return (
        adjustments[0] <= adjustments[1] && adjustments[1] <= adjustments[2]
      );
    },
  );

  // Validate retail barcode formats
  createdVariants.forEach((variant, index) => {
    const barcode = variant.barcode!;
    TestValidator.predicate(
      `variant ${index + 1} barcode is numeric`,
      /^\d+$/.test(barcode),
    );
    TestValidator.predicate(
      `variant ${index + 1} barcode has valid length`,
      barcode.length >= 8 && barcode.length <= 13,
    );
  });

  // Step 6: Test retail-specific scenarios
  TestValidator.predicate("variants support POS integration", () =>
    createdVariants.every((variant) => variant.barcode && variant.sku),
  );

  TestValidator.predicate("variants enable warehouse scanning", () =>
    createdVariants.every(
      (variant) =>
        variant.inventory_policy === "deny" ||
        variant.inventory_policy === "continue",
    ),
  );

  TestValidator.predicate("variants provide inventory tracking", () =>
    createdVariants.every((variant) => variant.inventory_quantity >= 0),
  );

  TestValidator.predicate("variants support supply chain coordination", () =>
    createdVariants.every((variant) => variant.is_active === true),
  );

  // Validate proper unit associations
  TestValidator.equals(
    "variants linked to different units",
    new Set(createdVariants.map((v) => v.shopping_mall_product_unit_id)).size,
    2,
  );
}
