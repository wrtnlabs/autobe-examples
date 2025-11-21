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

export async function test_api_seller_product_creation_complete_catalog(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for product creation access
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: "Limited Liability Company",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create primary product with comprehensive catalog information
  const sku = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = seller.id;

  const productData = {
    sku: sku,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
    compare_at_price: typia.random<
      number & tags.Minimum<1000> & tags.Maximum<2000>
    >(),
    cost: typia.random<number & tags.Minimum<5> & tags.Maximum<500>>(),
    condition: "new",
    weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
    weight_unit: "kg",
    barcode: RandomGenerator.alphaNumeric(12),
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    seo_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    seo_description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 9,
    }),
    tags: "electronics,gadgets,smart-devices",
    featured_image: `https://images.example.com/products/${sku}/featured.jpg`,
    category_id: categoryId,
    shopping_mall_seller_id: sellerId,
    ip: "192.168.1.100",
    href: "https://seller.example.com/products/create",
    referrer: "https://seller.example.com/dashboard",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 3: Create product units for variant organization (Size and Color)
  const sizeUnitData = {
    name: "Size",
    type: "size",
    display_style: "buttons",
    is_required: true,
    is_multiple: false,
    sort_order: 1,
  } satisfies IShoppingMallProductUnit.ICreate;

  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: sku,
      body: sizeUnitData,
    });
  typia.assert(sizeUnit);

  const colorUnitData = {
    name: "Color",
    type: "color",
    display_style: "swatches",
    is_required: true,
    is_multiple: false,
    sort_order: 2,
  } satisfies IShoppingMallProductUnit.ICreate;

  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: sku,
      body: colorUnitData,
    });
  typia.assert(colorUnit);

  // Step 4: Create product variants with size and color combinations
  const createdVariants: IShoppingMallProductVariant[] = [];

  const variantSku1 = `${sku}-S-BLUE`;
  const variant1Data = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_unit_id: sizeUnit.id,
    sku: variantSku1,
    title: "Small, Blue",
    price_adjustment: 0,
    inventory_quantity: 50,
    inventory_policy: "deny" as const,
    position: 0,
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;

  const variant1 =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: sku,
        body: variant1Data,
      },
    );
  createdVariants.push(variant1);
  typia.assert(variant1);

  const variantSku2 = `${sku}-M-RED`;
  const variant2Data = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_unit_id: sizeUnit.id,
    sku: variantSku2,
    title: "Medium, Red",
    price_adjustment: 10,
    inventory_quantity: 75,
    inventory_policy: "deny" as const,
    position: 1,
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;

  const variant2 =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: sku,
        body: variant2Data,
      },
    );
  createdVariants.push(variant2);
  typia.assert(variant2);

  const variantSku3 = `${sku}-L-GREEN`;
  const variant3Data = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_unit_id: sizeUnit.id,
    sku: variantSku3,
    title: "Large, Green",
    price_adjustment: -5,
    inventory_quantity: 30,
    inventory_policy: "deny" as const,
    position: 2,
    is_active: true,
  } satisfies IShoppingMallProductVariant.ICreate;

  const variant3 =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: sku,
        body: variant3Data,
      },
    );
  createdVariants.push(variant3);
  typia.assert(variant3);

  // Step 5: Validate product data integrity and business rules
  TestValidator.equals("product SKU matches input", product.sku, sku);
  TestValidator.equals(
    "product name matches input",
    product.name,
    productData.name,
  );
  TestValidator.equals(
    "product price matches input",
    product.price,
    productData.price,
  );
  TestValidator.equals(
    "product condition matches input",
    product.condition,
    productData.condition,
  );
  TestValidator.equals(
    "product shipping requirement matches",
    product.is_shipping_required,
    productData.is_shipping_required,
  );
  TestValidator.equals(
    "product taxable status matches",
    product.is_taxable,
    productData.is_taxable,
  );
  TestValidator.predicate(
    "product has seller relationship",
    product.seller.id === sellerId,
  );
  TestValidator.equals(
    "product status should be draft initially",
    product.status,
    "draft",
  );
  TestValidator.predicate(
    "product has variants created",
    product.variants_count !== undefined && product.variants_count >= 3,
  );
  TestValidator.predicate(
    "product has images available",
    product.images.length > 0,
  );

  // Step 6: Validate variant configuration and pricing adjustments
  TestValidator.equals("variant count matches", createdVariants.length, 3);
  TestValidator.equals(
    "first variant SKU matches",
    createdVariants[0].sku,
    variantSku1,
  );
  TestValidator.equals(
    "first variant price adjustment",
    createdVariants[0].price_adjustment,
    0,
  );
  TestValidator.equals(
    "second variant price adjustment",
    createdVariants[1].price_adjustment,
    10,
  );
  TestValidator.equals(
    "third variant price adjustment",
    createdVariants[2].price_adjustment,
    -5,
  );
  TestValidator.predicate(
    "all variants have proper inventory tracking",
    createdVariants.every((v) => v.inventory_quantity >= 0),
  );
  TestValidator.predicate(
    "all variants are active",
    createdVariants.every((v) => v.is_active === true),
  );

  // Step 7: Validate SEO optimization and marketplace visibility
  TestValidator.predicate(
    "product has SEO title",
    product.seo_title !== undefined &&
      product.seo_title !== null &&
      product.seo_title.length > 0,
  );
  TestValidator.predicate(
    "product has SEO description",
    product.seo_description !== undefined &&
      product.seo_description !== null &&
      product.seo_description.length > 0,
  );
  TestValidator.predicate(
    "product has tags for discoverability",
    product.tags !== null && product.tags!.includes("electronics"),
  );
  TestValidator.predicate(
    "product has featured image",
    product.featured_image !== undefined && product.featured_image !== null,
  );
  TestValidator.predicate(
    "product has comprehensive image gallery",
    product.images.length >= 3,
  );

  // Step 8: Validate inventory management and business rules
  TestValidator.predicate(
    "product enables quantity tracking",
    product.track_quantity === true,
  );
  TestValidator.predicate(
    "product disables backorders",
    product.allow_backorder === false,
  );
  TestValidator.predicate(
    "variants have appropriate inventory levels",
    product.inventory_status !== undefined,
  );
  TestValidator.equals(
    "product has correct seller ownership",
    product.seller.id,
    sellerId,
  );
  TestValidator.equals(
    "product has correct business information",
    product.seller.business_name,
    seller.business_name,
  );
  TestValidator.predicate(
    "seller is verified for product creation",
    seller.is_verified === true,
  );
  TestValidator.predicate(
    "product has creation timestamp",
    product.created_at !== null,
  );
  TestValidator.predicate(
    "product has update timestamp",
    product.updated_at !== null,
  );
  TestValidator.predicate(
    "product is ready for approval workflow",
    product.status === "draft",
  );
}
