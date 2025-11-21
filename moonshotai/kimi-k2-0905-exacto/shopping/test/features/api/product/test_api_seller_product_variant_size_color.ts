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
 * Test creating product variants combining size and color options with
 * inventory tracking per configuration. Validates that sellers can create
 * comprehensive product variants enabling customers to select specific
 * size-color combinations while maintaining accurate inventory counts for each
 * configuration.
 *
 * The test follows this workflow:
 *
 * 1. Register a seller account for authentication
 * 2. Create a base product (t-shirt) in the catalog
 * 3. Define size units (Small, Medium, Large) with dropdown display
 * 4. Define color units (Red, Blue, Green) with swatch display
 * 5. Create variants for each size-color combination
 * 6. Validate SKU uniqueness and inventory policies
 * 7. Verify variant relationships and display ordering
 *
 * This ensures proper e-commerce variant management with inventory tracking,
 * SKU uniqueness enforcement, and customer-friendly selection interfaces.
 */
export async function test_api_seller_product_variant_size_color(
  connection: api.IConnection,
) {
  // Step 1: Register seller account for variant creation authorization
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: "Fashion Boutique LLC",
      business_registration_number: typia.random<
        string & tags.Pattern<"^[A-Z]{2}[0-9]{8}$">
      >(),
      tax_id: typia.random<string & tags.Pattern<"^[0-9]{2}-[0-9]{7}$">>(),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create base product for variant generation
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: `TSHIRT-${RandomGenerator.alphaNumeric(6)}`,
        name: "Premium Cotton T-Shirt",
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        price: 29.99,
        condition: "new",
        weight: 0.25,
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        href: "https://fashion-boutique.com/dashboard/products/create",
        referrer: "https://fashion-boutique.com/dashboard/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create size unit configuration
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

  // Step 4: Create color unit configuration
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

  // Step 5: Create comprehensive size-color variant matrix
  const sizes = ["Small", "Medium", "Large"] as const;
  const colors = ["Red", "Blue", "Green"] as const;
  const variants: IShoppingMallProductVariant[] = [];
  const skuSet = new Set<string>();

  // Create variants with proper size-color combinations and inventory tracking
  for (const [sizeIndex, size] of sizes.entries()) {
    for (const [colorIndex, color] of colors.entries()) {
      const variantPosition = sizeIndex * colors.length + colorIndex;
      const baseSku = `${product.sku}-${size.substring(0, 1)}${color.substring(0, 1)}`;
      const uniqueSku = `${baseSku}-${RandomGenerator.alphaNumeric(4)}`;

      // Ensure SKU uniqueness
      TestValidator.predicate(
        "SKU is unique before creation",
        !skuSet.has(uniqueSku),
      );
      skuSet.add(uniqueSku);

      const inventoryQuantity = RandomGenerator.pick([15, 30, 45, 60, 80, 100]);
      const priceAdjustment =
        color === "Red" ? 3.5 : color === "Blue" ? 1.5 : 0; // Premium colors cost more

      const variant =
        await api.functional.shoppingMall.seller.products.variants.create(
          connection,
          {
            productCode: product.sku,
            body: {
              shopping_mall_product_id: product.id,
              shopping_mall_product_unit_id: sizeUnit.id, // Primary unit reference
              sku: uniqueSku,
              title: `${size}, ${color}`,
              price_adjustment: priceAdjustment,
              inventory_quantity: inventoryQuantity,
              inventory_policy: "deny",
              position: variantPosition,
              is_active: true,
            } satisfies IShoppingMallProductVariant.ICreate,
          },
        );
      typia.assert(variant);
      variants.push(variant);

      // Validate variant creation
      TestValidator.equals(
        "variant SKU matches requested",
        variant.sku,
        uniqueSku,
      );
      TestValidator.equals(
        "variant title matches size-color",
        variant.title,
        `${size}, ${color}`,
      );
      TestValidator.equals(
        "variant inventory policy",
        variant.inventory_policy,
        "deny",
      );
      TestValidator.equals("variant is active", variant.is_active, true);
      TestValidator.equals(
        "variant position matches request",
        variant.position,
        variantPosition,
      );
      TestValidator.predicate(
        "variant inventory is positive",
        variant.inventory_quantity > 0,
      );
      TestValidator.predicate(
        "variant inventory is realistic",
        variant.inventory_quantity >= 15 && variant.inventory_quantity <= 100,
      );
    }
  }

  // Step 6: Validate complete size-color matrix
  TestValidator.equals(
    "total variant count matches size-color combinations",
    variants.length,
    9,
  );

  // Verify all size-color combinations are represented
  const representedCombinations = new Set(variants.map((v) => v.title));
  for (const size of sizes) {
    for (const color of colors) {
      TestValidator.predicate(
        `size-color combination ${size}, ${color} exists`,
        representedCombinations.has(`${size}, ${color}`),
      );
    }
  }

  // Step 7: Validate SKU uniqueness across entire variant set
  const finalSkus = variants.map((v) => v.sku);
  const uniqueFinalSkus = [...new Set(finalSkus)];
  TestValidator.equals(
    "all variant SKUs remain unique",
    finalSkus.length,
    uniqueFinalSkus.length,
  );

  // Step 8: Validate price adjustment logic by color
  const redVariants = variants.filter((v) => v.title.includes("Red"));
  const blueVariants = variants.filter((v) => v.title.includes("Blue"));
  const greenVariants = variants.filter((v) => v.title.includes("Green"));

  TestValidator.predicate(
    "all red variants have $3.50 price adjustment",
    redVariants.every((v) => v.price_adjustment === 3.5),
  );
  TestValidator.predicate(
    "all blue variants have $1.50 price adjustment",
    blueVariants.every((v) => v.price_adjustment === 1.5),
  );
  TestValidator.predicate(
    "all green variants have no price adjustment",
    greenVariants.every((v) => v.price_adjustment === 0),
  );

  // Step 9: Validate display ordering is sequential and logical
  const allPositions = variants.map((v) => v.position);
  const expectedPositions = Array.from(
    { length: variants.length },
    (_, i) => i,
  );
  TestValidator.equals(
    "variant positions are sequential from 0",
    allPositions,
    expectedPositions,
  );

  // Step 10: Validate variant relationships and inventory diversity
  for (const variant of variants) {
    TestValidator.equals(
      "variant belongs to correct product",
      variant.shopping_mall_product_id,
      product.id,
    );
    TestValidator.predicate(
      "variant references valid unit",
      variant.shopping_mall_product_unit_id === sizeUnit.id,
    );

    // Validate inventory diversity
    TestValidator.predicate(
      "variant has sufficient inventory",
      variant.inventory_quantity >= 15,
    );
    TestValidator.predicate(
      "variant has reasonable inventory cap",
      variant.inventory_quantity <= 100,
    );
  }

  // Step 11: Validate inventory policy consistency
  TestValidator.predicate(
    "all variants use deny inventory policy",
    variants.every((v) => v.inventory_policy === "deny"),
  );

  // Step 12: Validate e-commerce usability features
  TestValidator.predicate(
    "variant titles are customer-friendly",
    variants.every((v) => v.title.includes(", ")),
  ); // Clear size, color separation
  TestValidator.predicate(
    "variant SKUs include size and color codes",
    variants.every(
      (v) =>
        v.sku.includes(product.sku) && v.sku.length > product.sku.length + 5,
    ),
  );
}
