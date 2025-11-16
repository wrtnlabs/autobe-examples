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
 * Test that administrators can access review history for any buyer account.
 *
 * This test validates admin oversight capabilities by verifying that
 * administrators can retrieve review histories for arbitrary buyer accounts in
 * the system. This functionality is essential for platform moderation, dispute
 * resolution, and analyzing review patterns across the marketplace.
 *
 * Test flow:
 *
 * 1. Create an admin account with elevated privileges
 * 2. Generate a target buyer ID and review search parameters
 * 3. Call the admin API to retrieve reviews for the specified buyer
 * 4. Validate the paginated response structure
 */
export async function test_api_admin_buyer_reviews_access_any_buyer(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with elevated privileges
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 2: Generate target buyer ID and review search parameters
  const targetBuyerId = typia.random<string & tags.Format<"uuid">>();

  const reviewSearchRequest = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    sort_by: RandomGenerator.pick([
      "created_at",
      "rating",
      "helpfulness",
    ] as const),
    sort_order: RandomGenerator.pick(["asc", "desc"] as const),
  } satisfies IShoppingMallReview.IRequest;

  // Step 3: Call admin API to retrieve buyer reviews
  const reviewsResponse: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.admin.buyers.reviews.index(connection, {
      buyerId: targetBuyerId,
      body: reviewSearchRequest,
    });

  // Step 4: Validate response structure - typia.assert validates everything
  typia.assert(reviewsResponse);
}
