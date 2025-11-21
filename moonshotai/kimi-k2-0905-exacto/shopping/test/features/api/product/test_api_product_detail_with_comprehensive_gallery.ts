import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test product detail retrieval including comprehensive image gallery with
 * multiple product photos, alternative views, detail shots, and lifestyle
 * imagery.
 *
 * This test validates the complete visual presentation of products through
 * comprehensive image gallery functionality. It ensures customers can make
 * informed purchase decisions through multi-angle product visualization,
 * accessibility-compliant alt text, and proper image ordering.
 *
 * Test flow:
 *
 * 1. Generate a random product code for testing
 * 2. Retrieve product details through the API
 * 3. Validate the response structure matches IShoppingMallProduct
 * 4. Test image gallery properties (URLs, ordering, primary designation)
 * 5. Verify alt text for accessibility compliance
 * 6. Check caption information where available
 * 7. Validate overall product data integrity
 */
export async function test_api_product_detail_with_comprehensive_gallery(
  connection: api.IConnection,
) {
  // Generate a random product code for testing
  const productCode = typia.random<string>();

  // Retrieve product details through the API
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.products.at(connection, {
      productCode,
    });

  // Validate the response structure matches IShoppingMallProduct
  typia.assert(product);

  // Test image gallery properties
  TestValidator.predicate(
    "product has images array",
    Array.isArray(product.images),
  );
  TestValidator.predicate(
    "product has at least one image",
    product.images.length >= 1,
  );

  // Validate each image in the gallery
  for (const image of product.images) {
    typia.assert<IShoppingMallProductImage>(image);

    // Verify image URL format and HTTPS validation
    TestValidator.predicate(
      "image URL is valid string",
      typeof image.image_url === "string",
    );
    TestValidator.predicate(
      "image URL starts with HTTPS",
      image.image_url.startsWith("https://"),
    );

    // Test alt text for accessibility compliance
    TestValidator.predicate(
      "image has alt text",
      typeof image.alt_text === "string",
    );
    TestValidator.predicate(
      "alt text is meaningful",
      image.alt_text.length > 0,
    );

    // Check caption information where available
    if (image.caption !== undefined) {
      TestValidator.predicate(
        "caption is string when defined",
        typeof image.caption === "string",
      );
    }

    // Validate display_order sequential numbering
    TestValidator.predicate(
      "display order is positive integer",
      image.display_order > 0,
    );
    TestValidator.predicate(
      "display order is valid integer",
      Number.isInteger(image.display_order),
    );

    // Verify is_primary is boolean
    TestValidator.predicate(
      "is_primary is boolean",
      typeof image.is_primary === "boolean",
    );
  }

  // Test primary image designation
  const primaryImages = product.images.filter((img) => img.is_primary === true);
  TestValidator.equals(
    "exactly one primary image present",
    primaryImages.length,
    1,
  );
  TestValidator.predicate(
    "primary image is included in images array",
    product.images.includes(primaryImages[0]),
  );

  // Validate display order sequence
  const expectedDisplayOrders = product.images
    .map((_, index) => index + 1)
    .sort((a, b) => a - b);
  const actualDisplayOrders = product.images
    .map((img) => img.display_order)
    .sort((a, b) => a - b);
  TestValidator.predicate(
    "display orders form valid sequential sequence",
    JSON.stringify(expectedDisplayOrders) ===
      JSON.stringify(actualDisplayOrders),
  );

  // Verify seller information is included and valid
  typia.assert<IShoppingMallSeller.ISummary>(product.seller);
  TestValidator.predicate(
    "seller ID is valid format",
    typeof product.seller.id === "string",
  );
  TestValidator.predicate(
    "seller business name is valid",
    typeof product.seller.business_name === "string",
  );

  // Verify category information is included and valid
  typia.assert<IShoppingMallProductCategory.ISummary>(product.category);
  TestValidator.predicate(
    "category ID is valid format",
    typeof product.category.id === "string",
  );
  TestValidator.predicate(
    "category name is valid",
    typeof product.category.name === "string",
  );

  // Confirm review statistics presence and format
  typia.assert<IShoppingMallProductReviewStatistics>(product.reviews);
  TestValidator.predicate(
    "reviews total count is valid",
    product.reviews.total_reviews >= 0,
  );
  TestValidator.predicate(
    "average rating format follows pattern",
    /^[1-5]\.\d{0,1}$/.test(product.reviews.average_rating),
  );

  // Verify inventory status presence
  typia.assert<IShoppingMallInventoryStatus>(product.inventory_status);

  // Test product variants integration
  TestValidator.predicate(
    "variants array exists",
    Array.isArray(product.variants),
  );
  for (const variant of product.variants) {
    typia.assert<IShoppingMallProductVariant.ISummary>(variant);
  }

  // Validate overall product data integrity
  TestValidator.predicate(
    "product has valid ID format",
    typeof product.id === "string",
  );
  TestValidator.predicate(
    "product has valid SKU format",
    typeof product.sku === "string",
  );
  TestValidator.predicate(
    "product has name property",
    typeof product.name === "string",
  );
  TestValidator.predicate(
    "product has description property",
    typeof product.description === "string",
  );
  TestValidator.predicate("product price is positive", product.price > 0);
  TestValidator.predicate(
    "product status is string",
    typeof product.status === "string",
  );
  TestValidator.predicate(
    "product condition is string",
    typeof product.condition === "string",
  );
}
