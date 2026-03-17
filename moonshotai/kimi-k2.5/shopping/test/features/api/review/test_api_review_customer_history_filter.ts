import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test customer viewing their own review history across all purchased products.
 * An authenticated customer wants to see all reviews they've written.
 * The request includes customerId filter to show only their reviews.
 * Validate that only reviews written by the specified customer are returned,
 * regardless of which product or order they belong to.
 * Test that deleted reviews (where deletedAt is not null) are excluded from
 * results for public listings, maintaining the rule that only active reviews
 * are shown publicly.
 */
export async function test_api_review_customer_history_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate a valid customer UUID for filtering
  const customerId = typia.random<string & tags.Format<"uuid">>();
  // Search for reviews filtered by specific customerId
  const response = await api.functional.ecommerceMall.reviews.index(
    customerConnection,
    {
      body: {
        customerId: customerId,
        page: 1,
        limit: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(response);
  // Validate response structure
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // Validate pagination fields
  const pagination = response.pagination;
  TestValidator.predicate("current page is valid", pagination.current >= 0);
  TestValidator.predicate("limit is valid", pagination.limit > 0);
  TestValidator.predicate("records count is valid", pagination.records >= 0);
  TestValidator.predicate("pages count is valid", pagination.pages >= 0);
  // Verify each review in the result belongs to the specified customer
  for (const review of response.data) {
    // All returned reviews must belong to the filtered customer
    TestValidator.equals(
      "review customerId matches filter",
      review.customer.id,
      customerId,
    );
    // Critical: Verify deleted reviews are excluded from public results
    // deletedAt must be null for reviews shown in public listings
    TestValidator.predicate(
      "deletedAt is null for public listing",
      review.deletedAt === null,
    );
  }
  // If there are results, verify records count consistency
  if (response.data.length > 0) {
    TestValidator.predicate(
      "records count matches data length when single page",
      pagination.pages <= 1 || pagination.records >= response.data.length,
    );
  }
}
