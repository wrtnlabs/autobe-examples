import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallReviewFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewFlag";
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import type { IShoppingMallReviewReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReply";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_review_moderation_pending_list(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Retrieve pending reviews via admin endpoint
  const pendingReviews: IPageIShoppingMallProductReview =
    await api.functional.shoppingMall.admin.dashboard.reviews.moderation.index(
      adminConnection,
    );
  // Step 3: Validate pagination metadata - business logic validation
  TestValidator.equals(
    "pagination current page is 1",
    pendingReviews.pagination.current,
    1,
  );
  // Step 4: Validate that all returned reviews have status 'pending'
  for (const review of pendingReviews.data) {
    TestValidator.equals("review status is pending", review.status, "pending");
  }
  // Step 5: Verify we have proper type safety with typia.assert
  typia.assert(pendingReviews);
}
