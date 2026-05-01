import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test global review listing with default search parameters.
 *
 * Validates the review search endpoint using default parameters — no filters,
 * default sort order (newest first), and default pagination (page 1, limit 20).
 * The test authenticates as a customer and verifies that the response includes
 * correct pagination metadata and properly ordered review summaries.
 *
 * 1. Customer registers and authenticates via join.
 * 2. Customer calls the review search endpoint with an empty request body,
 *    triggering all default behaviors.
 * 3. Validates pagination defaults: page 1 and limit 20 are applied.
 * 4. Verifies reviews are sorted by created_at in descending order so that
 *    the newest review appears first.
 */
export async function test_api_review_search_default_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Search reviews with default parameters
  const result = await api.functional.shoppingMall.customer.reviews.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallReviewReview.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination defaults
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("default limit is 20", result.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate reviews sorted by created_at descending (newest first)
  for (let i = 1; i < result.data.length; i++) {
    const prev = new Date(result.data[i - 1].created_at).getTime();
    const curr = new Date(result.data[i].created_at).getTime();
    TestValidator.predicate(
      "reviews sorted by created_at descending",
      prev >= curr,
    );
  }
}
