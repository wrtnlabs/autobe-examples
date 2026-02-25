import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_reviews_default_listing(
  connection: api.IConnection,
): Promise<void> {
  // Since we cannot create products, customers, or reviews through the available API functions,
  // we'll test the endpoint with a randomly generated product ID and verify the response structure
  // meets the expected format for an empty or existing product scenario.
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Call the endpoint with empty request body for default parameters
  const response = await api.functional.ecommerce.products.reviews.index(
    connection,
    {
      productId: productId,
      body: {} satisfies IEcommerceReview.IRequest,
    },
  );
  // Validate the response structure
  typia.assert(response);
  // Verify pagination metadata (even for empty results)
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records count should be >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be >= 0",
    response.pagination.pages >= 0,
  );
  // Verify the data array exists (could be empty)
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(response.data),
  );
  // If there are reviews returned, validate their structure
  for (const review of response.data) {
    typia.assert(review);
    TestValidator.predicate(
      "rating should be between 1-5",
      review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.predicate(
      "content should be string or null",
      review.content === null || typeof review.content === "string",
    );
    // Verify customer summary structure
    typia.assert(review.customer);
    TestValidator.predicate(
      "customer email should be valid format",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(review.customer.email),
    );
    TestValidator.predicate(
      "customer display_name should not be empty",
      review.customer.display_name.trim().length > 0,
    );
  }
  // If there are multiple reviews, verify they are sorted by newest first
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const currentDate = new Date(response.data[i].created_at);
      const previousDate = new Date(response.data[i - 1].created_at);
      TestValidator.predicate(
        "reviews should be sorted newest first",
        currentDate <= previousDate,
      );
    }
  }
}
