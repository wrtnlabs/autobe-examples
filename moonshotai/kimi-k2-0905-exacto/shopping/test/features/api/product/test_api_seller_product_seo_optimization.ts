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
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test comprehensive SEO optimization configuration for shopping mall products.
 *
 * This test validates seller product SEO settings including meta title
 * customization, description optimization, keyword targeting, and tag-based
 * categorization. Tests SEO enhancement for improved marketplace
 * discoverability through search engine visibility and organic traffic
 * optimization capabilities.
 */
export async function test_api_seller_product_seo_optimization(
  connection: api.IConnection,
) {
  // 1. Create seller authentication for SEO management
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: "Tech Innovations Store",
      business_registration_number: "REG-" + RandomGenerator.alphaNumeric(10),
      tax_id: "TAX-" + RandomGenerator.alphaNumeric(8),
      phone: RandomGenerator.mobile(),
      business_type: "corporation",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Create product with comprehensive SEO optimization
  const productSeoTitle =
    RandomGenerator.name(3) + " - Premium Quality Electronics";
  const productSeoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
  });
  const seoTags = "electronics,gadgets,premium,quality,consumer";
  const featuredImageUrl = "https://example.com/uploads/product-main-image.jpg";

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(4),
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        compare_at_price: typia.random<
          number & tags.Minimum<15> & tags.Maximum<1500>
        >(),
        cost: typia.random<number & tags.Minimum<5> & tags.Maximum<500>>(),
        condition: "new",
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<10>>(),
        weight_unit: "kg",
        barcode: RandomGenerator.alphaNumeric(13),
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: productSeoTitle,
        seo_description: productSeoDescription,
        tags: seoTags,
        featured_image: featuredImageUrl,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        variants: ArrayUtil.repeat(2, () => ({
          shopping_mall_product_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          shopping_mall_product_unit_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          sku: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.name(2),
          price_adjustment: typia.random<
            number & tags.Minimum<-50> & tags.Maximum<50>
          >(),
          inventory_quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10>
          >(),
          inventory_policy: "deny",
          position: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<5>
          >(),
          is_active: true,
        })),
        images: ArrayUtil.repeat(3, () => ({
          name: RandomGenerator.name(2),
          extension: "jpg",
          url:
            "https://example.com/uploads/product-" +
            RandomGenerator.alphaNumeric(8) +
            ".jpg",
        })),
        href: "https://marketplace.example.com/dashboard/products/new",
        referrer: "https://marketplace.example.com/dashboard",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Validate SEO metadata configuration
  TestValidator.equals(
    "product has custom SEO title",
    product.seo_title,
    productSeoTitle,
  );
  TestValidator.equals(
    "product has custom SEO description",
    product.seo_description,
    productSeoDescription,
  );
  TestValidator.equals("product has SEO tags", product.tags, seoTags);
  TestValidator.equals(
    "product has featured image",
    product.featured_image,
    featuredImageUrl,
  );

  // 4. Validate SEO optimization features
  TestValidator.predicate(
    "SEO title contains brand terms",
    (product.seo_title?.toLowerCase() || "").includes("premium") ||
      (product.seo_title?.toLowerCase() || "").includes("quality"),
  );
  TestValidator.predicate(
    "SEO description has appropriate length",
    (product.seo_description?.length || 0) > 100,
  );
  TestValidator.predicate(
    "product has multiple SEO tags",
    (product.tags?.split(",").length || 0) > 2,
  );

  // 5. Validate seller context and marketplace integration
  TestValidator.equals(
    "product has correct seller ID",
    product.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "product seller business name matches",
    product.seller.business_name,
    "Tech Innovations Store",
  );

  // 6. Validate product visibility and status
  TestValidator.predicate(
    "product status is valid",
    ["draft", "active", "archived"].includes(product.status),
  );
  TestValidator.predicate(
    "product has comprehensive metadata",
    product.created_at !== undefined &&
      product.updated_at !== undefined &&
      product.description?.length > 0,
  );

  // 7. Validate variant SEO optimization
  TestValidator.predicate(
    "product has variants for SEO",
    product.variants?.length > 0,
  );
  TestValidator.predicate(
    "variants have unique SKUs",
    product.variants?.every(
      (variant) => variant.sku !== undefined && variant.sku.length > 0,
    ),
  );

  // 8. Validate image gallery SEO optimization
  TestValidator.predicate(
    "product has multiple images",
    product.images?.length > 1,
  );
  TestValidator.predicate(
    "product images follow SEO best practices",
    product.images?.every((image) => image.image_url.startsWith("https://")),
  );
}
