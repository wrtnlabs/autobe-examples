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
 * Test successful product creation with complete product information including
 * pricing, descriptions, inventory settings, and SEO optimization.
 *
 * This comprehensive test validates the complete product listing workflow for
 * marketplace sellers:
 *
 * 1. Seller registration and authentication setup
 * 2. Complete product data generation with all required and optional fields
 * 3. Inventory management configuration with tracking and backorder settings
 * 4. SEO optimization with meta tags and descriptions
 * 5. Product variants and image gallery setup
 * 6. Validation of created product against input specifications
 * 7. Verification of seller ownership and category relationships
 * 8. Confirmation of proper inventory and review initialization
 *
 * The test ensures sellers can successfully create fully-featured product
 * listings with comprehensive catalog information, optimal marketplace
 * visibility, and proper inventory management configurations for customer
 * purchase experiences.
 */
export async function test_api_seller_product_creation_success(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "sole_proprietorship",
        "corporation",
        "llc",
        "partnership",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Generate product category and image data
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const productImages = ArrayUtil.repeat(3, () => ({
    name: RandomGenerator.name(),
    extension: RandomGenerator.pick(["jpg", "png", "webp"] as const),
    url: typia.random<string & tags.Format<"uri">>(),
  })) satisfies IShoppingMallProductImage.ICreate[];

  // Step 3: Create comprehensive product with all required fields and existing optional fields
  const productData = {
    sku: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
    >(),
    compare_at_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<150> & tags.Maximum<15000>
    >(),
    cost: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<5000>
    >(),
    condition: RandomGenerator.pick(["new", "used", "refurbished"] as const),
    weight: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    weight_unit: RandomGenerator.pick(["kg", "g", "lb", "oz"] as const),
    barcode: RandomGenerator.alphaNumeric(12),
    track_quantity: true,
    allow_backorder: false,
    is_shipping_required: true,
    is_taxable: true,
    seo_title: RandomGenerator.name(4),
    seo_description: RandomGenerator.paragraph({ sentences: 6 }),
    tags: "electronics,gadgets,tech",
    featured_image: typia.random<string & tags.Format<"uri">>(),
    category_id: categoryId,
    shopping_mall_seller_id: seller.id,
    images: productImages,
    ip: "192.168.1.1",
    href: "https://marketplace.example.com/seller/products/create",
    referrer: "https://marketplace.example.com/seller/dashboard",
  } satisfies IShoppingMallProduct.ICreate;

  // Step 4: Create the product
  const createdProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(createdProduct);

  // Step 5: Validate core product information
  TestValidator.equals(
    "product SKU matches",
    createdProduct.sku,
    productData.sku,
  );
  TestValidator.equals(
    "product name matches",
    createdProduct.name,
    productData.name,
  );
  TestValidator.equals(
    "product description matches",
    createdProduct.description,
    productData.description,
  );
  TestValidator.equals(
    "product price matches",
    createdProduct.price,
    productData.price,
  );
  TestValidator.equals(
    "product condition matches",
    createdProduct.condition,
    productData.condition,
  );
  TestValidator.equals(
    "product weight matches",
    createdProduct.weight,
    productData.weight,
  );
  TestValidator.equals(
    "product weight unit matches",
    createdProduct.weight_unit,
    productData.weight_unit,
  );
  TestValidator.equals(
    "product status is draft by default",
    createdProduct.status,
    "draft",
  );

  // Step 6: Validate optional fields that exist in the response
  TestValidator.equals(
    "compare at price matches",
    createdProduct.compare_at_price,
    productData.compare_at_price,
  );
  TestValidator.equals("cost matches", createdProduct.cost, productData.cost);
  TestValidator.equals(
    "barcode matches",
    createdProduct.barcode,
    productData.barcode,
  );
  TestValidator.equals(
    "SEO title matches",
    createdProduct.seo_title,
    productData.seo_title,
  );
  TestValidator.equals(
    "SEO description matches",
    createdProduct.seo_description,
    productData.seo_description,
  );
  TestValidator.equals("tags match", createdProduct.tags, productData.tags);
  TestValidator.equals(
    "featured image matches",
    createdProduct.featured_image,
    productData.featured_image,
  );

  // Step 7: Validate seller and category relationships
  TestValidator.equals(
    "seller ID matches",
    createdProduct.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "seller email matches",
    createdProduct.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "seller business name matches",
    createdProduct.seller.business_name,
    seller.business_name,
  );
  TestValidator.equals(
    "category ID matches",
    createdProduct.category.id,
    productData.category_id,
  );

  // Step 8: Validate images
  TestValidator.equals(
    "image count matches",
    createdProduct.images.length,
    productData.images?.length ?? 0,
  );

  if (createdProduct.images.length > 0) {
    TestValidator.equals(
      "first image URL matches",
      createdProduct.images[0].image_url,
      productData.images?.[0].url,
    );
    TestValidator.equals(
      "first image alt text matches",
      createdProduct.images[0].alt_text,
      productData.images?.[0].name,
    );
  }

  // Step 9: Validate inventory and review initialization
  TestValidator.predicate(
    "inventory status is properly initialized",
    () =>
      createdProduct.inventory_status !== null &&
      typeof createdProduct.inventory_status === "object",
  );
  TestValidator.predicate(
    "review statistics are properly initialized",
    () =>
      createdProduct.reviews !== null &&
      typeof createdProduct.reviews === "object" &&
      createdProduct.reviews.total_reviews >= 0,
  );

  // Step 10: Validate timestamps and lifecycle
  TestValidator.predicate("created at timestamp is recent", () => {
    const createdTime = new Date(createdProduct.created_at).getTime();
    const currentTime = Date.now();
    return createdTime <= currentTime && createdTime > currentTime - 60000; // Within last minute
  });
  TestValidator.equals(
    "updated at matches created at",
    createdProduct.updated_at,
    createdProduct.created_at,
  );
  TestValidator.equals(
    "published at is null for draft",
    createdProduct.published_at,
    null,
  );
  TestValidator.equals("deleted at is null", createdProduct.deleted_at, null);

  // Step 11: Validate generated fields
  TestValidator.predicate("product has valid UUID", () =>
    typia.is<string & tags.Format<"uuid">>(createdProduct.id),
  );
  TestValidator.predicate("image IDs are valid UUIDs", () =>
    createdProduct.images.every((image) =>
      typia.is<string & tags.Format<"uuid">>(image.id),
    ),
  );
}
