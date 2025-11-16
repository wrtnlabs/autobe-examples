import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test administrator's ability to filter buyer reviews by moderation status.
 *
 * This test validates that administrators can effectively manage the review
 * moderation workflow by filtering reviews based on their moderation status
 * (pending_moderation, approved, rejected). This functionality is essential for
 * admins to prioritize their moderation tasks and maintain review quality.
 *
 * Test workflow:
 *
 * 1. Create admin account and authenticate
 * 2. Generate test buyer ID for filtering
 * 3. Test filtering by "pending_moderation" status
 * 4. Test filtering by "approved" status
 * 5. Test filtering by "rejected" status
 * 6. Validate that each filter returns only matching reviews
 * 7. Verify pagination metadata correctness
 */
export async function test_api_admin_buyer_reviews_moderation_status_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "moderator",
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Generate test buyer ID
  const buyerId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Test filtering by "pending_moderation" status
  const pendingRequest = {
    page: 1,
    limit: 20,
    status: "pending_moderation",
  } satisfies IShoppingMallReview.IRequest;

  const pendingResponse =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: pendingRequest,
    });
  typia.assert(pendingResponse);

  // Validate all returned reviews have pending_moderation status
  for (const review of pendingResponse.data) {
    TestValidator.equals(
      "review status should be pending_moderation",
      review.status,
      "pending_moderation",
    );
  }

  // Step 4: Test filtering by "approved" status
  const approvedRequest = {
    page: 1,
    limit: 20,
    status: "approved",
  } satisfies IShoppingMallReview.IRequest;

  const approvedResponse =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: approvedRequest,
    });
  typia.assert(approvedResponse);

  // Validate all returned reviews have approved status
  for (const review of approvedResponse.data) {
    TestValidator.equals(
      "review status should be approved",
      review.status,
      "approved",
    );
  }

  // Step 5: Test filtering by "rejected" status
  const rejectedRequest = {
    page: 1,
    limit: 20,
    status: "rejected",
  } satisfies IShoppingMallReview.IRequest;

  const rejectedResponse =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: buyerId,
      body: rejectedRequest,
    });
  typia.assert(rejectedResponse);

  // Validate all returned reviews have rejected status
  for (const review of rejectedResponse.data) {
    TestValidator.equals(
      "review status should be rejected",
      review.status,
      "rejected",
    );
  }

  // Step 6: Validate pagination metadata
  TestValidator.equals(
    "pending response pagination current page",
    pendingResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pending response pagination limit",
    pendingResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "approved response pagination current page",
    approvedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "approved response pagination limit",
    approvedResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "rejected response pagination current page",
    rejectedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "rejected response pagination limit",
    rejectedResponse.pagination.limit,
    20,
  );
}
