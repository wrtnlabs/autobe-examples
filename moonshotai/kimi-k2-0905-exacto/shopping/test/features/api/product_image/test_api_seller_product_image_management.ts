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
 * Test comprehensive product image management during seller product creation.
 *
 * This test validates the complete image management workflow for seller product
 * creation including primary image designation, gallery organization, alt text
 * optimization, image URL validation, display ordering, and accessibility
 * compliance. The scenario tests multiple image uploads with proper sequencing,
 * primary image selection mechanics, and ensures responsive image optimization
 * for both mobile and desktop displays.
 *
 * Test flow:
 *
 * 1. Register a new seller account for authentic product creation
 * 2. Create a product with comprehensive image gallery including multiple images
 * 3. Validate image URL format and accessibility metadata
 * 4. Test primary image designation and display ordering
 * 5. Verify image gallery organization and alt text compliance
 * 6. Validate that product creation successfully handles the complete image
 *    configuration
 */
export async function test_api_seller_product_image_management(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register seller account for product creation permissions
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number:
        RandomGenerator.alphaNumeric(10).toUpperCase(),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "corporation",
        "llc",
        "partnership",
        "sole_proprietorship",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  TestValidator.predicate(
    "seller account created successfully",
    seller.id !== null,
  );
  TestValidator.predicate("seller is authenticated", seller.token !== null);

  // Step 2: Prepare comprehensive image data with multiple images
  const productImages = ArrayUtil.repeat(5, (index) => ({
    name: `product-image-${index + 1}`,
    extension: RandomGenerator.pick(["jpg", "png", "webp"] as const),
    url: `https://example-cdn.com/product-images/${RandomGenerator.alphaNumeric(8)}/${index + 1}.${RandomGenerator.pick(["jpg", "png", "webp"] as const)}`,
  }));

  // Step 3: Create product with comprehensive image gallery
  const productData = {
    sku: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    price: typia.random<number & tags.Minimum<10> & tags.Maximum<10000>>(),
    compare_at_price: typia.random<
      number & tags.Minimum<10> & tags.Maximum<15000>
    >(),
    cost: typia.random<number & tags.Minimum<5> & tags.Maximum<5000>>(),
    condition: RandomGenerator.pick(["new", "used", "refurbished"] as const),
    weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<50>>(),
    weight_unit: RandomGenerator.pick(["kg", "g", "lb", "oz"] as const),
    barcode: RandomGenerator.alphaNumeric(12),
    track_quantity: true,
    allow_backorder: RandomGenerator.pick([true, false] as const),
    is_shipping_required: true,
    is_taxable: true,
    seo_title: RandomGenerator.name(5),
    seo_description: RandomGenerator.paragraph({ sentences: 2 }),
    tags: RandomGenerator.sample(
      ["electronics", "fashion", "home", "beauty", "sports"],
      3,
    ).join(", "),
    featured_image: productImages[0].url, // First image as featured
    category_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: seller.id,
    images: productImages satisfies IShoppingMallProductImage.ICreate[],
    href: `https://seller-dashboard.example.com/products/create`,
    referrer: `https://seller-dashboard.example.com/dashboard`,
  } satisfies IShoppingMallProduct.ICreate;

  // Step 4: Create product with image gallery
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 5: Validate product creation with image management
  TestValidator.equals(
    "product created with correct seller",
    product.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "product has correct number of images",
    product.images.length,
    productImages.length,
  );
  TestValidator.equals(
    "featured image matches first image",
    product.featured_image,
    productImages[0].url,
  );

  // Step 6: Validate individual image properties
  product.images.forEach((image, index) => {
    TestValidator.predicate(
      "image has valid ID",
      typia.is<string & tags.Format<"uuid">>(image.id),
    );
    TestValidator.equals(
      "image belongs to correct product",
      image.product_id,
      product.id,
    );
    TestValidator.predicate(
      "image has valid URL format",
      typia.is<string & tags.Format<"uri">>(image.image_url),
    );
    TestValidator.predicate("image has alt text", image.alt_text.length > 0);
    TestValidator.predicate(
      "display order is positive",
      image.display_order > 0,
    );
    TestValidator.predicate(
      "is_primary flag is boolean",
      typeof image.is_primary === "boolean",
    );
    TestValidator.predicate(
      "has timestamps",
      image.created_at !== null && image.updated_at !== null,
    );
  });

  // Step 7: Validate image ordering and primary designation
  const sortedImages = [...product.images].sort(
    (a, b) => a.display_order - b.display_order,
  );
  TestValidator.predicate(
    "images are ordered correctly",
    sortedImages.every((img, i) => img.display_order === i + 1),
  );

  const primaryImages = product.images.filter((img) => img.is_primary === true);
  TestValidator.predicate(
    "exactly one primary image exists",
    primaryImages.length === 1,
  );
  TestValidator.predicate(
    "primary image has display order 1",
    primaryImages[0].display_order === 1,
  );

  // Step 8: Validate accessibility compliance
  product.images.forEach((image) => {
    TestValidator.predicate(
      "alt text provides accessibility",
      image.alt_text.length >= 10,
    );
    TestValidator.predicate(
      "alt text is descriptive",
      image.alt_text.includes("product") || image.alt_text.includes("image"),
    );
  });

  // Step 9: Validate responsive image optimization indicators
  product.images.forEach((image) => {
    TestValidator.predicate(
      "image URL uses HTTPS for security",
      image.image_url.startsWith("https://"),
    );
    TestValidator.predicate(
      "image has file extension",
      image.image_url.match(/\.(jpg|jpeg|png|webp)$/i) !== null,
    );
  });

  // Step 10: Validate business logic compliance
  TestValidator.predicate(
    "product has inventory status",
    product.inventory_status !== null,
  );
  TestValidator.predicate(
    "product has review statistics",
    product.reviews !== null,
  );
  TestValidator.predicate(
    "product status is valid",
    ["active", "draft", "archived"].includes(product.status),
  );
}
