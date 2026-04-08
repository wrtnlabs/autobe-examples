import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_reviews_create } from "../../../generate/generate_random_ecommerce_customer_reviews_create";
import { prepare_random_ecommerce_review } from "../../../prepare/prepare_random_ecommerce_review";

/**
 * Test review snapshot access control - only review owners can access their snapshots.
 *
 * Validates that customers cannot access other customers' review snapshot history. This test ensures proper ownership-based authorization is enforced when retrieving review audit trails.
 *
 * 1. Two customers authenticate separately with unique credentials.
 * 2. Customer A creates a review for a delivered order item.
 * 3. Customer A edits the review to generate a snapshot.
 * 4. Customer B attempts to access Customer A's review snapshots.
 * 5. Validates that Customer B receives a 403 Forbidden response.
 * 6. Validates that Customer A can successfully access their own review snapshots.
 */
export async function test_api_review_snapshot_access_control_owner_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate two customers
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerA);
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerB);
  // 2. Customer A creates a review (utility handles order item preparation)
  const review = await generate_random_ecommerce_customer_reviews_create(
    customerAConnection,
    {},
  );
  typia.assert(review);
  // 3. Customer A edits the review to generate a snapshot
  const updatedReview = await api.functional.ecommerce.customer.reviews.update(
    customerAConnection,
    {
      reviewId: review.id,
      body: {
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceReview.IUpdate,
    },
  );
  typia.assert(updatedReview);
  // 4. Customer B attempts to access Customer A's review snapshots - should fail with 403
  await TestValidator.httpError(
    "customer B cannot access customer A's review snapshots",
    403,
    async () => {
      await api.functional.ecommerce.customer.reviews.snapshots.index(
        customerBConnection,
        {
          reviewId: review.id,
          body: {},
        },
      );
    },
  );
  // 5. Customer A can successfully access their own review snapshots
  const snapshots =
    await api.functional.ecommerce.customer.reviews.snapshots.index(
      customerAConnection,
      {
        reviewId: review.id,
        body: {},
      },
    );
  typia.assert(snapshots);
  // 6. Validate snapshots contain expected data (at least one snapshot from the edit)
  TestValidator.predicate(
    "snapshot history contains at least one snapshot",
    snapshots.data.length > 0,
  );
}
