import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product reviews retrieval sorted by newest first.
 *
 * Validates that product reviews are correctly retrieved and sorted by creation date in descending order. This test ensures the review listing endpoint returns properly structured review summaries with correct pagination metadata.
 *
 * The test verifies the sorting behavior, response structure, and data integrity of the product reviews endpoint. It confirms that reviews are ordered from newest to oldest and that all required fields are present in the response.
 *
 * 1. Call the reviews index endpoint with a valid product ID
 * 2. Validate the response structure matches IPageIEcommerceReview.ISummary
 * 3. Verify pagination metadata contains valid current page, limit, records, and pages
 * 4. Confirm reviews are sorted by created_at in descending order
 * 5. Validate each review contains required fields: id, customer, product, rating, content, created_at, updated_at
 * 6. Verify all reviews have valid rating values between 1 and 5
 */
export async function test_api_product_reviews_retrieval_newest_first(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection for accessing product reviews
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate a random product ID for testing
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the reviews index endpoint
  const output: IPageIEcommerceReview.ISummary =
    await api.functional.ecommerce.products.reviews.index(customerConnection, {
      productId,
      body: {
        page: 1,
        limit: 20,
        sort: "created_at DESC",
      } satisfies IEcommerceReview.IRequest,
    });
  typia.assert(output);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current is positive",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  // If there are reviews, validate sorting and structure
  if (output.data.length > 0) {
    // Validate reviews are sorted by created_at DESC (newest first)
    for (let i = 1; i < output.data.length; i++) {
      const previous = output.data[i - 1];
      const current = output.data[i];
      TestValidator.predicate(
        `review ${i} is older than review ${i - 1}`,
        new Date(current.created_at).getTime() <=
          new Date(previous.created_at).getTime(),
      );
    }
    // Validate each review structure
    for (const review of output.data) {
      // Validate rating is between 1 and 5
      TestValidator.predicate(
        "rating is between 1 and 5",
        review.rating >= 1 && review.rating <= 5,
      );
      // Validate customer has required fields
      TestValidator.predicate(
        "customer has id",
        review.customer.id !== undefined,
      );
      TestValidator.predicate(
        "customer has display_name",
        review.customer.display_name !== undefined,
      );
      // Validate product has required fields
      TestValidator.predicate(
        "product has id",
        review.product.id !== undefined,
      );
      TestValidator.predicate(
        "product has name",
        review.product.name !== undefined,
      );
      // Validate timestamps are valid ISO 8601 format
      TestValidator.predicate(
        "created_at is valid date",
        !isNaN(Date.parse(review.created_at)),
      );
      TestValidator.predicate(
        "updated_at is valid date",
        !isNaN(Date.parse(review.updated_at)),
      );
    }
  }
}
