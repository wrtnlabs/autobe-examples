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
 * Test product creation with advanced SEO configuration including meta titles,
 * descriptions, tags, and structured data. Validates search engine visibility
 * optimization, catalog discoverability enhancement, marketplace indexing
 * improvements, and organic traffic generation capabilities for seller
 * success.
 */
export async function test_api_seller_product_seo_optimization_setup(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for SEO-optimized product operations
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number:
        "REG" + RandomGenerator.alphaNumeric(8).toUpperCase(),
      tax_id: "TAX" + RandomGenerator.alphaNumeric(10).toUpperCase(),
      phone: RandomGenerator.mobile("010"),
      business_type: RandomGenerator.pick([
        "corporation",
        "partnership",
        "sole_proprietorship",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create product with comprehensive SEO settings
  const productSKU =
    "SEO-PROD-" + RandomGenerator.alphaNumeric(10).toUpperCase();
  const productName =
    RandomGenerator.name(3) +
    " " +
    RandomGenerator.pick([
      "Gaming Laptop",
      "Wireless Headphones",
      "Smartphone",
      "Digital Camera",
      "Coffee Maker",
    ] as const);
  const seoTitle =
    RandomGenerator.name(4) + " - Premium Quality " + productName;
  const seoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 4,
    wordMax: 8,
  });
  const seoTags = ArrayUtil.repeat(5, () =>
    RandomGenerator.pick([
      "high-quality",
      "premium",
      "durable",
      "innovative",
      "stylish",
      "professional",
      "eco-friendly",
      "award-winning",
    ] as const),
  ).join(", ");

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: productSKU,
        name: productName,
        description: RandomGenerator.content({
          paragraphs: 4,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 5,
          wordMax: 10,
        }),
        price: typia.random<number & tags.Minimum<50> & tags.Maximum<2000>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.5> & tags.Maximum<5>>(),
        weight_unit: "kg",
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: seoTitle,
        seo_description: seoDescription.substr(0, 500), // Limit for meta description
        tags: seoTags,
        featured_image: "https://example.com/product-main-image.jpg",
        category_id: typia.random<string & tags.Format<"uuid">>(), // Generate actual UUID format
        shopping_mall_seller_id: seller.id,
        variants: [],
        images: [
          {
            name: "product-main.jpg",
            extension: "jpg",
            url: "https://example.com/product-main-image.jpg",
          },
          {
            name: "product-detail-1.jpg",
            extension: "jpg",
            url: "https://example.com/product-detail-1.jpg",
          },
          {
            name: "product-lifestyle.jpg",
            extension: "jpg",
            url: "https://example.com/product-lifestyle.jpg",
          },
        ],
        ip: "192.168.1.100",
        href: "https://selling.mall.com/product/new",
        referrer: "https://selling.mall.com/dashboard/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Validate SEO properties were properly set
  TestValidator.equals("product SKU matches", product.sku, productSKU);
  TestValidator.equals("product name matches", product.name, productName);
  TestValidator.equals("SEO title matches", product.seo_title, seoTitle);
  TestValidator.equals(
    "SEO description matches",
    product.seo_description,
    seoDescription.substr(0, 500),
  );
  TestValidator.equals("SEO tags match", product.tags, seoTags);
  TestValidator.equals("product status is draft", product.status, "draft");
  TestValidator.equals("image count matches", product.images.length, 3);
  TestValidator.equals("seller ID matches", product.seller.id, seller.id);
  TestValidator.equals(
    "seller email matches",
    product.seller.email,
    sellerEmail,
  );

  // Step 4: Create product units for variant management
  const sizeUnit =
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

  const colorUnit =
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

  // Step 5: Create product variants with SEO-friendly configurations
  const colors = ["Black", "White", "Silver", "Navy"] as const;
  const sizes = ["S", "M", "L", "XL"] as const;

  // Generate exactly 3 variants using the created product SKU
  const variants: IShoppingMallProductVariant[] = [];
  for (let i = 0; i < 3; i++) {
    const color = RandomGenerator.pick(colors);
    const size = RandomGenerator.pick(sizes);
    const variantTitle = `${size}, ${color}`;
    const variantSKU = `${productSKU}-${size}-${color}`;
    const variantImage = `https://example.com/product-${color.toLowerCase()}-${size.toLowerCase()}.jpg`;

    const variant =
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productCode: productSKU,
          body: {
            shopping_mall_product_id: product.id,
            shopping_mall_product_unit_id: colorUnit.id,
            sku: variantSKU,
            title: variantTitle,
            price_adjustment: typia.random<
              number & tags.Minimum<0> & tags.Maximum<50>
            >(),
            inventory_quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<500>
            >(),
            inventory_policy: "deny",
            position: i,
            is_active: true,
            image: variantImage,
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    variants.push(variant);
  }

  // Validate variants were created
  TestValidator.equals("variants length is 3", variants.length, 3);
  TestValidator.predicate(
    "all variants have valid titles",
    variants.every((v) =>
      /[S|M|L|XL], (Black|White|Silver|Navy)/.test(v.title),
    ),
  );
  TestValidator.predicate(
    "all variants have SKU format",
    variants.every((v) => v.sku.startsWith(productSKU)),
  );
  TestValidator.predicate(
    "all variants have images",
    variants.every((v) => v.image !== null && v.image !== undefined),
  );

  // Step 6: Verify final product integrity with SEO optimization
  const finalProduct = product;
  TestValidator.equals(
    "product has reviews statistics",
    finalProduct.reviews.total_reviews,
    0,
  );
  TestValidator.equals(
    "product is trackable",
    finalProduct.track_quantity,
    true,
  );
  TestValidator.equals(
    "product allows shipping",
    finalProduct.is_shipping_required,
    true,
  );
  TestValidator.equals(
    "product SEO tags length",
    finalProduct.tags!.split(", ").length,
    5,
  );

  // Step 7: Validate marketplace discoverability features
  TestValidator.predicate(
    "SEO title is within optimal length",
    finalProduct.seo_title!.length >= 50 &&
      finalProduct.seo_title!.length <= 70,
  );
  TestValidator.predicate(
    "SEO description is within optimal length",
    finalProduct.seo_description!.length >= 100 &&
      finalProduct.seo_description!.length <= 500,
  );
  TestValidator.predicate(
    "meta tags are diverse",
    finalProduct.tags!.split(", ").length >= 5,
  );

  // Log comprehensive SEO success metrics
  console.log(`✅ SEO-optimized product created: ${finalProduct.sku}`);
  console.log(`✅ SEO title: ${finalProduct.seo_title}`);
  console.log(
    `✅ SEO description length: ${finalProduct.seo_description!.length} characters`,
  );
  console.log(`✅ Variants created: ${variants.length}`);
  console.log(`✅ Images attached: ${finalProduct.images.length}`);
}
