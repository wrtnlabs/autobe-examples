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
 * Test product detail retrieval with aggregated customer review statistics
 * including average rating, total review count, and rating distribution
 * breakdown (5-star, 4-star, 3-star, 2-star, 1-star counts). Validates that
 * review data provides social proof and quality indicators for informed
 * customer purchase decisions through comprehensive rating analysis.
 */
export async function test_api_product_detail_with_review_statistics(
  connection: api.IConnection,
) {
  // Generate random product code for test
  const productCode = RandomGenerator.alphaNumeric(8);

  // Retrieve product detail including comprehensive review statistics
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.products.at(connection, {
      productCode: productCode,
    });

  // Validate response type
  typia.assert(product);

  // Verify core product information
  TestValidator.equals(
    "product code should match request",
    product.sku,
    productCode,
  );
  TestValidator.predicate(
    "product should have valid name",
    product.name.length > 0,
  );
  TestValidator.predicate(
    "product should have valid description",
    product.description.length > 0,
  );
  TestValidator.predicate(
    "product price should be positive",
    product.price > 0,
  );

  // Validate review statistics structure and content
  const reviews = product.reviews;
  typia.assert(reviews);

  TestValidator.predicate(
    "review statistics ID should be valid UUID",
    /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(reviews.id),
  );
  TestValidator.equals(
    "review statistics should link to correct product",
    reviews.shopping_product_id,
    product.id,
  );

  // Validate review counts
  TestValidator.predicate(
    "total review count should be non-negative",
    reviews.total_reviews >= 0,
  );
  TestValidator.predicate(
    "average rating should follow single decimal pattern",
    /^[1-5]\.\d{0,1}$/.test(reviews.average_rating),
  );

  // Validate rating distribution counts
  [
    reviews.five_star_count,
    reviews.four_star_count,
    reviews.three_star_count,
    reviews.two_star_count,
    reviews.one_star_count,
  ]
    .filter((count) => count !== undefined)
    .forEach((count) => {
      TestValidator.predicate(
        "individual rating count should be non-negative",
        count! >= 0,
      );
    });

  // Validate calculated fields when present
  if (product.reviews_count !== undefined) {
    TestValidator.equals(
      "product reviews count should equal statistics total",
      product.reviews_count,
      reviews.total_reviews,
    );
  }
  if (product.average_rating !== undefined) {
    TestValidator.equals(
      "product average rating should equal statistics average rating",
      product.average_rating.toString(),
      reviews.average_rating,
    );
  }

  // Validate timeline information
  const createdDate = new Date(reviews.created_at);
  const updatedDate = new Date(reviews.updated_at);
  const calculationDate = new Date(reviews.last_calculation_at);

  TestValidator.predicate(
    "created date should be valid",
    !isNaN(createdDate.getTime()),
  );
  TestValidator.predicate(
    "updated date should be valid",
    !isNaN(updatedDate.getTime()),
  );
  TestValidator.predicate(
    "calculation date should be valid",
    !isNaN(calculationDate.getTime()),
  );
  TestValidator.predicate(
    "calculation date should not be before created date",
    calculationDate >= createdDate,
  );
  TestValidator.predicate(
    "updated date should not be before created date",
    updatedDate >= createdDate,
  );

  // Validate seller information
  const seller = product.seller;
  TestValidator.predicate(
    "seller should have valid business name",
    seller.business_name.length > 0,
  );
  TestValidator.predicate(
    "seller verification status should be valid",
    ["pending", "verified", "suspended", "rejected"].includes(
      seller.verification_status,
    ),
  );
  TestValidator.predicate(
    "seller should have valid email format",
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      seller.email,
    ),
  );

  // Validate category information
  const category = product.category;
  TestValidator.predicate(
    "category should have valid name",
    category.name.length > 0,
  );
  TestValidator.predicate(
    "category should have valid path",
    category.path.length > 0,
  );
  TestValidator.predicate(
    "category level should be non-negative",
    category.level >= 0,
  );

  // Validate product variants
  TestValidator.predicate(
    "variants should be array",
    Array.isArray(product.variants),
  );
  if (product.variants.length > 0) {
    TestValidator.predicate(
      "first variant should have valid SKU",
      product.variants[0].sku.length > 0,
    );
    TestValidator.predicate(
      "first variant should have valid title",
      product.variants[0].title.length > 0,
    );
    TestValidator.predicate(
      "variant inventory should be non-negative",
      product.variants[0].inventory_quantity >= 0,
    );
  }

  // Validate product images
  TestValidator.predicate(
    "images should be array",
    Array.isArray(product.images),
  );
  if (product.images.length > 0) {
    TestValidator.predicate(
      "first image should have valid URL",
      product.images[0].image_url.length > 0,
    );
    TestValidator.predicate(
      "first image should have alt text",
      product.images[0].alt_text.length > 0,
    );
    TestValidator.predicate(
      "first image display order should be positive",
      product.images[0].display_order >= 1,
    );
  }

  // Validate inventory status
  TestValidator.predicate(
    "inventory status should be object",
    typeof product.inventory_status === "object" &&
      product.inventory_status !== null,
  );

  // Validate business logic relationships
  TestValidator.equals(
    "review statistics should reference correct product ID",
    reviews.shopping_product_id,
    product.id,
  );
  TestValidator.predicate(
    "product should have at least one variant",
    product.variants.length > 0,
  );
  TestValidator.predicate(
    "product should have at least one image",
    product.images.length > 0,
  );
  TestValidator.predicate(
    "product should have category association",
    category.id !== undefined,
  );
  TestValidator.predicate(
    "product should have seller association",
    seller.id !== undefined,
  );

  // Additional quality validations
  TestValidator.predicate(
    "product weight should be non-negative if present",
    product.weight === null ||
      product.weight === undefined ||
      product.weight >= 0,
  );
  TestValidator.predicate(
    "compare at price should be non-negative if present",
    product.compare_at_price === null ||
      product.compare_at_price === undefined ||
      product.compare_at_price >= 0,
  );
  TestValidator.predicate(
    "product cost should be non-negative if present",
    product.cost === null || product.cost === undefined || product.cost >= 0,
  );
}
