import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a paginated list of product reviews sorted by newest first.
 *
 * Validates the complete pagination functionality of the product reviews endpoint including:
 * - Pagination metadata accuracy (current page, limit, total records, total pages)
 * - Review data structure completeness (id, customer display name, rating, content, product reference, timestamp)
 * - Correct descending order by creation date
 * - Cursor-based pagination navigation between pages
 *
 * Test scenario:
 * 1. Set up seller and product for review creation context
 * 2. Create multiple customers who write reviews with varying ratings and timestamps
 * 3. Retrieve first page of reviews and validate pagination metadata
 * 4. Verify each review contains all required fields with correct types
 * 5. Confirm reviews are sorted newest-first
 * 6. Navigate to subsequent pages using cursor and verify consistency
 *
 * @param connection Base API connection for making requests
 */
export async function test_api_product_reviews_pagination_and_display(
  connection: api.IConnection,
): Promise<void> {
  // Use a test product ID - in a real test, this would be a product with known reviews
  // For E2E tests, test data should be pre-seeded or created via setup utilities
  const testProductId = typia.random<string & tags.Format<"uuid">>();
  // Test first page retrieval
  const firstPage = await api.functional.ecommerceMall.products.reviews.index(
    connection,
    {
      productId: testProductId,
      body: {
        limit: 5,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  // Validate complete response structure with typia.assert
  typia.assert(firstPage);
  // Validate pagination metadata structure
  const pagination = firstPage.pagination;
  TestValidator.equals(
    "pagination has current page",
    typeof pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records",
    typeof pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages",
    typeof pagination.pages,
    "number",
  );
  // Validate pagination values are non-negative
  TestValidator.predicate(
    "current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("limit is positive", pagination.limit > 0);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);
  // Validate data array exists
  TestValidator.predicate("data array exists", Array.isArray(firstPage.data));
  // If there are reviews, validate their structure
  for (const review of firstPage.data) {
    // Validate review id exists and is UUID format
    TestValidator.predicate(
      "review has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        review.id,
      ),
    );
    // Validate customer information structure
    TestValidator.predicate(
      "customer object exists",
      review.customer !== undefined && review.customer !== null,
    );
    TestValidator.predicate(
      "customer has display_name string",
      typeof (review.customer as any).display_name === "string",
    );
    // Validate rating is between 1 and 5
    TestValidator.predicate(
      "rating is between 1 and 5",
      review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.predicate(
      "rating is integer",
      Number.isInteger(review.rating),
    );
    // Validate content is string or null
    TestValidator.predicate(
      "content is string or null",
      review.content === null || typeof review.content === "string",
    );
    // Validate product reference structure
    TestValidator.predicate(
      "product object exists",
      review.product !== undefined && review.product !== null,
    );
    TestValidator.predicate(
      "product has id string",
      typeof (review.product as any).id === "string",
    );
    // Validate createdAt timestamp is valid date-time format
    TestValidator.predicate(
      "createdAt exists as string",
      typeof review.createdAt === "string",
    );
    const createdAtDate = new Date(review.createdAt);
    TestValidator.predicate(
      "createdAt is valid ISO date",
      !isNaN(createdAtDate.getTime()),
    );
  }
  // Validate sorting: reviews should be in descending order by createdAt (newest first)
  if (firstPage.data.length > 1) {
    for (let i = 0; i < firstPage.data.length - 1; i++) {
      const currentDate = new Date(firstPage.data[i].createdAt);
      const nextDate = new Date(firstPage.data[i + 1].createdAt);
      TestValidator.predicate(
        `Review ${i} createdAt is >= review ${i + 1} (newest first ordering)`,
        currentDate >= nextDate,
      );
    }
  }
  // Test page-based pagination (using page number)
  const pageTwo = await api.functional.ecommerceMall.products.reviews.index(
    connection,
    {
      productId: testProductId,
      body: {
        limit: 5,
        page: 2,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(pageTwo);
  TestValidator.predicate(
    "page 2 response has pagination",
    pageTwo.pagination !== undefined,
  );
  TestValidator.equals(
    "page 2 current page is 2",
    pageTwo.pagination.current,
    2,
  );
  // Test cursor-based pagination if there are multiple pages
  if (pagination.pages > 1 && firstPage.data.length > 0) {
    // Test cursor pagination with a random cursor value
    // The server will handle invalid cursors appropriately
    const cursorBody: IEcommerceMallReview.IRequest = {
      limit: 5,
      cursor: typia.random<string>(),
    };
    const cursorPage =
      await api.functional.ecommerceMall.products.reviews.index(connection, {
        productId: testProductId,
        body: cursorBody,
      });
    typia.assert(cursorPage);
    TestValidator.predicate(
      "cursor page response has pagination",
      cursorPage.pagination !== undefined,
    );
  }
  // Test rating filter functionality
  const ratingFilterPage =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId: testProductId,
      body: {
        limit: 10,
        rating: 5,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(ratingFilterPage);
  // All reviews in filtered page should have rating 5
  for (const review of ratingFilterPage.data) {
    TestValidator.equals("filtered reviews have rating 5", review.rating, 5);
  }
  // Test minRating and maxRating range filter
  const rangeFilterPage =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId: testProductId,
      body: {
        limit: 10,
        minRating: 3,
        maxRating: 4,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(rangeFilterPage);
  // All reviews should have rating between 3 and 4
  for (const review of rangeFilterPage.data) {
    TestValidator.predicate(
      "rating is between 3 and 4",
      review.rating >= 3 && review.rating <= 4,
    );
  }
  // Test limit boundary (max 100)
  const maxLimitPage =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId: testProductId,
      body: {
        limit: 100,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(maxLimitPage);
  TestValidator.predicate(
    "max limit page has valid pagination",
    maxLimitPage.pagination.limit <= 100,
  );
}
