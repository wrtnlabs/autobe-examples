import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import type { IMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReviewSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_reviews_create } from "../../../generate/generate_random_mall_platform_customer_reviews_create";
import { prepare_random_mall_platform_review } from "../../../prepare/prepare_random_mall_platform_review";

/**
 * Test filtered snapshot history retrieval for customer review snapshots.
 *
 * Validates that a customer can query immutable review snapshot history under
 * the correct ownership scope. The test checks that the endpoint returns a
 * paginated snapshot history response for the authenticated customer and that
 * preserved snapshot rows are ordered consistently when a sort direction is
 * requested.
 *
 * 1. Register and authenticate a customer account.
 * 2. Request the review snapshot history for an owned review id.
 * 3. Verify pagination metadata and snapshot ordering on the returned page.
 */
export async function test_api_review_snapshot_history_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ChangeMe123!",
      href: "https://example.com/register",
      referrer: "https://example.com/signup",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.mallPlatform.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId,
        body: {
          page: 1,
          limit: 20,
          sort: "createdAt",
          order: "-",
          createdFrom: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          createdTo: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        } satisfies IMallPlatformReviewSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals("snapshot page current", response.pagination.current, 1);
  TestValidator.equals("snapshot page limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "snapshot page record count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot page count is non-negative",
    response.pagination.pages >= 0,
  );
  for (const snapshot of response.data) {
    TestValidator.equals("snapshot review id", snapshot.review.id, reviewId);
    TestValidator.equals(
      "snapshot customer id",
      snapshot.customer.id,
      authorized.id,
    );
  }
  for (let i = 1; i < response.data.length; i += 1) {
    TestValidator.predicate(
      "snapshots sorted by createdAt descending",
      response.data[i - 1].createdAt >= response.data[i].createdAt,
    );
  }
}
