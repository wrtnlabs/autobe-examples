import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator review filtering by rating range and creation date.
 * Validates that administrators can filter reviews for dispute investigation.
 */
export async function test_api_review_admin_filter_by_rating_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Set up date range filter (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const createdFrom = thirtyDaysAgo.toISOString();
  const createdTo = now.toISOString();
  // 3. Filter reviews by rating range (1-2 stars for negative feedback)
  const requestBody = {
    ratingMin: 1,
    ratingMax: 2,
    createdFrom,
    createdTo,
    limit: 50,
  } satisfies IShoppingMallReview.IRequest;
  const page = await api.functional.shoppingMall.reviews.index(
    adminConnection,
    { body: requestBody },
  );
  typia.assert(page);
  // 4. Validate rating range for all returned reviews
  for (const review of page.data) {
    TestValidator.predicate(
      "rating within 1-2 range",
      review.rating >= 1 && review.rating <= 2,
    );
  }
  // 5. Validate date range for all returned reviews
  for (const review of page.data) {
    const reviewDate = new Date(review.created_at).getTime();
    const fromTime = new Date(createdFrom).getTime();
    const toTime = new Date(createdTo).getTime();
    TestValidator.predicate(
      "created_at within date range",
      reviewDate >= fromTime && reviewDate <= toTime,
    );
  }
  // 6. Validate pagination
  TestValidator.equals("limit matches", page.pagination.limit, 50);
  TestValidator.equals("current page is 1", page.pagination.current, 1);
  TestValidator.predicate(
    "records count is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count matches records",
    page.pagination.pages === Math.ceil(page.pagination.records / 50),
  );
}
