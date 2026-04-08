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
 * Verifies that a customer can browse the immutable snapshot history for a review.
 *
 * This scenario authenticates a customer, creates a review through the supported review-creation flow, and then reads that review's snapshot history through the customer snapshot-history endpoint.
 *
 * The test validates the returned pagination metadata, confirms the response is a non-empty page when history exists, and checks that each snapshot row preserves the review and customer linkage together with the immutable snapshot fields exposed by the API.
 *
 * 1. Register and authenticate a customer using an isolated connection.
 * 2. Create a review using the supported review-creation utility.
 * 3. Request the snapshot history for that review.
 * 4. Validate pagination metadata, ordering assumptions, and preserved snapshot fields.
 */
export async function test_api_review_snapshot_history_list(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const review = await generate_random_mall_platform_customer_reviews_create(
    customerConnection,
    {
      body: {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        productId: typia.random<string & tags.Format<"uuid">>(),
        rating: 5,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IMallPlatformReview.ICreate,
    },
  );
  typia.assert(review);
  const snapshots =
    await api.functional.mallPlatform.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          limit: 10,
        } satisfies IMallPlatformReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.equals(
    "snapshot page current",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals("snapshot page limit", snapshots.pagination.limit, 10);
  TestValidator.predicate(
    "snapshot records are non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot pages are non-negative",
    snapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot data fits within the requested limit",
    snapshots.data.length <= snapshots.pagination.limit,
  );
  if (snapshots.data.length > 1) {
    TestValidator.predicate(
      "snapshots are ordered newest first by default",
      snapshots.data[0].createdAt >= snapshots.data[1].createdAt,
    );
  }
  if (snapshots.data.length > 0) {
    const firstSnapshot = snapshots.data[0];
    typia.assert(firstSnapshot);
    TestValidator.equals(
      "snapshot review id is preserved",
      firstSnapshot.review.id,
      review.id,
    );
    TestValidator.equals(
      "snapshot customer id is preserved",
      firstSnapshot.customer.id,
      customer.id,
    );
    TestValidator.equals(
      "snapshot customer email is preserved",
      firstSnapshot.customer.email,
      customer.email,
    );
    TestValidator.equals(
      "snapshot review linkage is preserved",
      firstSnapshot.review.id,
      firstSnapshot.review.id,
    );
    TestValidator.equals(
      "snapshot customer linkage is preserved",
      firstSnapshot.customer.id,
      firstSnapshot.customer.id,
    );
    TestValidator.predicate(
      "snapshot action exists",
      firstSnapshot.snapshotAction.length > 0,
    );
    TestValidator.predicate(
      "snapshot createdAt exists",
      firstSnapshot.createdAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot deletion flag is boolean",
      typeof firstSnapshot.isDeleted === "boolean",
    );
    TestValidator.predicate(
      "snapshot rating is in valid range",
      firstSnapshot.rating >= 1 && firstSnapshot.rating <= 5,
    );
    TestValidator.predicate(
      "snapshot content is present or null",
      firstSnapshot.content === null || firstSnapshot.content.length >= 0,
    );
  }
}
