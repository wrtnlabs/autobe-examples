import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer review history retrieval with pagination.
 *
 * This test validates the review history endpoint for authenticated customers,
 * ensuring proper pagination, sorting, and data structure. The test creates a
 * customer account, retrieves their review history with default pagination
 * (page=1, limit=20), and verifies the response structure including pagination
 * metadata and review summaries.
 */
export async function test_api_customer_review_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Retrieve review history with default pagination (page=1, limit=20)
  const page1Response =
    await api.functional.shoppingMall.customer.reviews.my_history.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(page1Response);
  // 3. Verify pagination metadata
  TestValidator.equals(
    "pagination.current equals 1 for first page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit equals 20 for default",
    page1Response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is calculated correctly",
    page1Response.pagination.pages ===
      Math.ceil(
        page1Response.pagination.records / page1Response.pagination.limit,
      ),
  );
  // 4. Verify data array length respects limit
  TestValidator.predicate(
    "data array length does not exceed limit",
    page1Response.data.length <= page1Response.pagination.limit,
  );
  // 5. Verify data isolation - all reviews belong to authenticated customer
  for (const review of page1Response.data) {
    TestValidator.equals(
      `review ${review.id} belongs to authenticated customer`,
      review.customer.id,
      customer.id,
    );
  }
  // 6. Test pagination with explicit page parameter
  const page2Response =
    await api.functional.shoppingMall.customer.reviews.my_history.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallReview.IRequest,
      },
    );
  typia.assert(page2Response);
  // 7. Verify page 2 pagination metadata
  TestValidator.equals(
    "page 2 pagination.current equals 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination.limit equals 10",
    page2Response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 2 data length does not exceed limit",
    page2Response.data.length <= 10,
  );
  // 8. Verify sorting by created_at descending (if multiple reviews exist)
  if (page1Response.data.length >= 2) {
    const firstReview = page1Response.data[0];
    const secondReview = page1Response.data[1];
    TestValidator.predicate(
      "reviews are sorted by created_at descending",
      new Date(firstReview.created_at).getTime() >=
        new Date(secondReview.created_at).getTime(),
    );
  }
  // 9. Verify active reviews have null deleted_at
  for (const review of page1Response.data) {
    TestValidator.equals(
      `active review ${review.id} has null deleted_at`,
      review.deleted_at,
      null,
    );
  }
}
