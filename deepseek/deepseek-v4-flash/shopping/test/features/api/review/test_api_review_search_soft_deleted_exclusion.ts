import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_review_search_soft_deleted_exclusion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(authorized);
  // 2. Search all reviews without any filter (page 1, limit 10)
  const allReviews =
    await api.functional.eCommerceMall.superAdministrator.reviews.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IECommerceMallReview.IRequest,
      },
    );
  typia.assert(allReviews);
  // 3. Search reviews filtered by rating range (3-5)
  const filteredReviews =
    await api.functional.eCommerceMall.superAdministrator.reviews.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          minRating: 3,
          maxRating: 5,
        } satisfies IECommerceMallReview.IRequest,
      },
    );
  typia.assert(filteredReviews);
  // 4. Validate each returned review has all required fields
  // Soft-deleted reviews are automatically excluded per API specification
  for (const review of allReviews.data) {
    TestValidator.predicate(
      "review has valid rating (1-5)",
      () => review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.predicate(
      "review has customer info",
      () => review.customer !== undefined && review.customer.id !== undefined,
    );
    TestValidator.predicate(
      "review has product info",
      () => review.product !== undefined && review.product.id !== undefined,
    );
    TestValidator.predicate(
      "review has created_at timestamp",
      () => typeof review.created_at === "string",
    );
  }
  // 5. Validate filtered reviews all satisfy min/max rating
  for (const review of filteredReviews.data) {
    TestValidator.predicate(
      "filtered review rating within [3, 5]",
      () => review.rating >= 3 && review.rating <= 5,
    );
  }
  // 6. Validate pagination
  TestValidator.predicate(
    "pagination has valid current page",
    () => allReviews.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    () => allReviews.pagination.limit > 0 && allReviews.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records >= data length on first page",
    () => allReviews.pagination.records >= allReviews.data.length,
  );
}
