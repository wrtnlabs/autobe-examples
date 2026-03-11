import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

/**
 * Test administrator access to review snapshots for dispute resolution.
 *
 * This test validates that administrators can view snapshots of any customer's
 * review, enabling them to investigate review manipulation claims and assess
 * disputes. Administrators have elevated privileges to access snapshots even
 * for reviews they don't own.
 *
 * Steps:
 * 1. Customer registers and authenticates
 * 2. Customer creates a review
 * 3. Administrator registers and authenticates
 * 4. Administrator retrieves snapshots for the customer's review
 * 5. Validate administrator receives snapshot data
 */
export async function test_api_review_snapshot_admin_access_dispute_resolution(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Customer registers and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Step 2: Customer creates a review
  // The generate function creates a review with random but valid data
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {},
  );
  typia.assert(review);
  // Step 3: Administrator registers and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // Step 4: Administrator retrieves snapshots for the customer's review
  // This demonstrates admin privilege to access any review's snapshots
  const snapshots =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Step 5: Validate administrator access
  // Administrator successfully retrieved snapshots for a review they don't own
  // This proves admin privilege for dispute resolution
  TestValidator.predicate(
    "administrator can access any review's snapshots",
    snapshots.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination metadata is valid",
    snapshots.pagination.limit === 10 && snapshots.pagination.pages >= 0,
  );
  // Verify the data structure matches expected format
  // Snapshots array exists (may be empty if review was never edited)
  TestValidator.predicate(
    "snapshots data array exists",
    Array.isArray(snapshots.data),
  );
}
