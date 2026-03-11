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
 * Test administrator review listing functionality.
 * Validates that administrators can retrieve paginated list of all reviews
 * with proper filtering, pagination, and soft-delete handling.
 */
export async function test_api_review_admin_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Call PATCH /shoppingMall/reviews with empty request body (default pagination)
  const response = await api.functional.shoppingMall.reviews.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(response);
  // 3. Verify pagination consistency (business logic)
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pagination pages calculated correctly",
    response.pagination.pages,
    expectedPages,
  );
  // 4. Verify reviews are sorted by created_at DESC (newest first)
  if (response.data.length > 1) {
    const sortedByDesc = response.data.every((review, index) => {
      if (index === response.data.length - 1) return true;
      const currentCreatedAt = new Date(review.created_at).getTime();
      const nextCreatedAt = new Date(
        response.data[index + 1].created_at,
      ).getTime();
      return currentCreatedAt >= nextCreatedAt;
    });
    TestValidator.predicate("reviews sorted by created_at DESC", sortedByDesc);
  }
  // 5. Verify soft-deleted reviews are excluded by default (deleted_at IS NULL)
  const allActiveReviews = response.data.every(
    (review) => review.deleted_at === null,
  );
  TestValidator.predicate(
    "soft-deleted reviews excluded by default",
    allActiveReviews,
  );
}
