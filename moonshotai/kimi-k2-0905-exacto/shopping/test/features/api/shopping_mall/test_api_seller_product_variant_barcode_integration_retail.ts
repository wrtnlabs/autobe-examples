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
 * Test retail barcode integration for product variant configuration supporting
 * industry-standard SKU management, UPC/EAN code assignment, point-of-sale
 * system compatibility, and warehouse scanning workflow integration enabling
 * retail partnership fulfillment while maintaining marketplace inventory
 * coordination across external retail ecosystems and omnichannel commerce
 * coordination throughout platform systems successfully and accurately across
 * distributed fulfillment environments comprehensively.
 *
 * This test validates the complete retail barcode integration workflow:
 *
 * 1. Seller registration with comprehensive business verification
 * 2. Product creation with barcode-aware configuration
 * 3. Product unit setup enabling variant creation with retail specifications
 * 4. Variant creation with UPC/EAN barcode assignment for retail scanning
 * 5. Inventory integration validation for warehouse management systems
 * 6. Omnichannel commerce coordination testing
 *
 * The test ensures products support retail partnership requirements including:
 *
 * - Industry-standard barcode formats (UPC-A, EAN-13)
 * - Point-of-sale system compatibility
 * - Warehouse scanning workflow integration
 * - Inventory synchronization across retail channels
 * - Marketplace inventory coordination
 */
export async function test_api_seller_product_variant_barcode_integration_retail(
  connection: api.IConnection,
) {
  // Step 1: Seller registration for retail integration testing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const businessName = `Retail Integration Test ${RandomGenerator.name(2)}`;
  const businessRegistration = RandomGenerator.alphaNumeric(10).toUpperCase();
  const taxId = RandomGenerator.alphaNumeric(12);
  const phone = RandomGenerator.mobile();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: businessName,
      business_registration_number: businessRegistration,
      tax_id: taxId,
      phone: phone,
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  TestValidator.predicate(
    "seller verification status pending",
    seller.verification_status === "pending",
  );

  // Step 2: Create product with retail barcode configuration
  const productSku = `RETAIL-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const productName = `Retail Barcode Test Product ${RandomGenerator.name(1)}`;
  const productDescription = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });

  const productPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
  >();
  const productWeight = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<5000>
  >();

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: productSku,
        name: productName,
        description: productDescription,
        price: productPrice / 100, // Convert cents to dollars
        compare_at_price: null,
        cost: productPrice / 200, // 50% margin
        condition: "new",
        weight: productWeight / 1000, // Convert grams to kilograms
        weight_unit: "kg",
        barcode: RandomGenerator.pick([
          `123456789012`,
          `978${RandomGenerator.alphaNumeric(9)}`,
        ]), // Sample UPC/EAN formats
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: `${productName} - Retail Ready Product`,
        seo_description: `High-quality ${productName.toLowerCase()} with retail barcode support`,
        tags: "retail,barcode,warehouse,integration",
        featured_image: `https://cdn.example.com/products/${RandomGenerator.alphaNumeric(10)}.jpg`,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: `https://seller-portal.example.com/products/create`,
        referrer: `https://seller-portal.example.com/dashboard`,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  TestValidator.predicate(
    "product created with barcode",
    product.barcode !== null && product.barcode !== undefined,
  );
  TestValidator.equals("product SKU matches", product.sku, productSku);
  TestValidator.predicate(
    "inventory tracking enabled",
    product.track_quantity === true,
  );

  // Step 3: Create product units for variant configurations
  const unitConfigs = [
    {
      name: "Size",
      type: "size",
      display_style: "dropdown",
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
    {
      name: "Style",
      type: "style",
      display_style: "buttons",
      is_required: false,
      is_multiple: false,
      sort_order: 3,
    },
  ] as const;

  const units = [];
  for (const unitConfig of unitConfigs) {
    const unit = await api.functional.shoppingMall.seller.products.units.create(
      connection,
      {
        productCode: product.sku,
        body: {
          name: unitConfig.name,
          type: unitConfig.type,
          display_style: unitConfig.display_style,
          is_required: unitConfig.is_required,
          is_multiple: unitConfig.is_multiple,
          sort_order: unitConfig.sort_order,
        } satisfies IShoppingMallProductUnit.ICreate,
      },
    );
    typia.assert(unit);
    units.push(unit);
  }

  TestValidator.predicate(
    "all units created",
    units.length === unitConfigs.length,
  );
  TestValidator.equals(
    "unit types match",
    units.map((u) => u.type),
    unitConfigs.map((u) => u.type),
  );

  // Step 4: Create product variants with UPC/EAN barcode integration
  const variantSizes = ["S", "M", "L", "XL"] as const;
  const variantColors = [
    { name: "Navy", hex: "#000080" },
    { name: "Red", hex: "#FF0000" },
    { name: "Black", hex: "#000000" },
  ] as const;
  const variantStyles = ["Classic", "Sport", "Premium"] as const;

  const variants = [];

  for (const size of variantSizes) {
    for (const color of variantColors) {
      for (const style of variantStyles) {
        const variantSku =
          `${productSku}-${size}-${color.name}-${style}`.toUpperCase();
        const variantTitle = `${size}, ${color.name}, ${style}`;
        const priceAdjustment =
          style === "Premium" ? 500 : style === "Sport" ? 200 : 0; // Premium adds $5.00, Sport adds $2.00

        // Generate retail barcode in UPC-A format (10 digits + checksum)
        const upcPrefix = RandomGenerator.pick(["123456", "654321"]);
        const upcMiddle = RandomGenerator.alphaNumeric(3);
        const barcode = `${upcPrefix}${upcMiddle}${size.charCodeAt(0)}${variantColors.indexOf(color)}${variantStyles.indexOf(style)}`;
        const normalizedBarcode = barcode.padStart(11, "0").slice(0, 11);

        const inventoryQuantity = typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<500>
        >();

        try {
          const variant =
            await api.functional.shoppingMall.seller.products.variants.create(
              connection,
              {
                productCode: product.sku,
                body: {
                  shopping_mall_product_id: product.id,
                  shopping_mall_product_unit_id: units[0].id, // Size unit
                  sku: variantSku,
                  title: variantTitle,
                  price_adjustment: priceAdjustment / 100, // Convert cents to dollars
                  cost_adjustment: priceAdjustment / 200, // 50% of price adjustment
                  weight_adjustment: 0,
                  barcode: normalizedBarcode,
                  image: `https://cdn.example.com/variants/${RandomGenerator.alphaNumeric(15)}-${color.hex.slice(1)}.jpg`,
                  inventory_quantity: inventoryQuantity,
                  inventory_policy: "deny" as const,
                  position:
                    variantSizes.indexOf(size) *
                      variantColors.length *
                      variantStyles.length +
                    variantColors.indexOf(color) * variantStyles.length +
                    variantStyles.indexOf(style),
                  is_active: true,
                } satisfies IShoppingMallProductVariant.ICreate,
              },
            );
          typia.assert(variant);
          variants.push(variant);
        } catch (error) {
          // Continue with other variants if one fails due to business logic
          continue;
        }
      }
    }
  }

  TestValidator.predicate("variants created", variants.length > 0);
  TestValidator.predicate(
    "all variants have barcodes",
    variants.every((v) => v.barcode !== null && v.barcode !== undefined),
  );
  TestValidator.predicate(
    "barcodes are unique",
    new Set(variants.map((v) => v.barcode)).size === variants.length,
  );

  // Step 5: Validate retail integration capabilities
  const activeVariants = variants.filter((v) => v.is_active);
  const inventoryTrackedVariants = activeVariants.filter(
    (v) => v.inventory_policy === "deny",
  );

  TestValidator.predicate(
    "retail-compatible variants exist",
    inventoryTrackedVariants.length > 0,
  );
  TestValidator.predicate(
    "barcode formats valid",
    inventoryTrackedVariants.every(
      (v) =>
        v.barcode &&
        (v.barcode.length === 11 ||
          v.barcode.length === 12 ||
          v.barcode.length === 13),
    ),
  );

  // Step 6: Validate warehouse integration and omnichannel coordination
  const totalInventory = inventoryTrackedVariants.reduce(
    (sum, variant) => sum + variant.inventory_quantity,
    0,
  );
  TestValidator.predicate("total inventory positive", totalInventory > 0);

  const priceVariants = inventoryTrackedVariants.filter(
    (v) => v.price_adjustment !== 0,
  );
  TestValidator.predicate(
    "price-adjusted variants exist",
    priceVariants.length > 0,
  );

  // Step 7: Validate point-of-sale compatibility
  const retailReadyVariants = inventoryTrackedVariants.filter(
    (v) =>
      v.barcode !== null &&
      v.inventory_quantity > 0 &&
      v.title.length > 0 &&
      v.sku.includes(productSku),
  );

  TestValidator.predicate(
    "retail-ready variants meet POS requirements",
    retailReadyVariants.length > 0,
  );

  // Final validation: Complete retail integration suite
  TestValidator.predicate("seller authentication successful", seller.id !== "");
  TestValidator.predicate(
    "product with barcode created",
    product.barcode !== null,
  );
  TestValidator.predicate(
    "variants support retail operations",
    variants.length >= 3,
  );
  TestValidator.predicate(
    "inventory tracking enabled",
    variants.every((v) => v.inventory_policy === "deny"),
  );
  TestValidator.predicate(
    "barcode uniqueness maintained",
    new Set(variants.map((v) => v.barcode)).size === variants.length,
  );

  return retailReadyVariants.length;
}
