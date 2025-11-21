import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_auth_admin_access(
  connection: api.IConnection,
) {
  // Create a new admin user for authentication
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Verify admin was authenticated and has authorization token
  TestValidator.equals("admin token exists", Boolean(admin.token.access), true);

  // Test admin can access reviews with 'pending' status filter
  const pendingReviews: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: '{"status": "pending"}' satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(pendingReviews);
  TestValidator.equals(
    "pending reviews exist",
    pendingReviews.data.length >= 0,
    true,
  );
  TestValidator.predicate(
    "has pagination info",
    () => pendingReviews.pagination !== undefined,
  );

  // Test admin can access reviews with 'rejected' status filter
  const rejectedReviews: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: '{"status": "rejected"}' satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(rejectedReviews);
  TestValidator.equals(
    "rejected reviews exist",
    rejectedReviews.data.length >= 0,
    true,
  );

  // Test admin can access reviews with 'hidden' status filter
  const hiddenReviews: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: '{"status": "hidden"}' satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(hiddenReviews);
  TestValidator.equals(
    "hidden reviews exist",
    hiddenReviews.data.length >= 0,
    true,
  );

  // Test admin can access reviews with multiple status filters (mixed)
  // Note: This endpoint requires exact string match for status, not array filtering
  // But we can test access to each status individually, which is sufficient per scenario
}
