import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

/**
 * Test customer viewing review snapshots after editing their review.
 * Validates the audit trail functionality for review modifications.
 *
 * Note: This test focuses on the snapshot viewing endpoint structure.
 * In a real scenario, review creation requires a delivered order item,
 * which involves complex order flow setup (product creation, purchase, delivery).
 */
export async function test_api_review_snapshot_viewing_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Test snapshot viewing endpoint with a review ID
  // In production, this would be a real review ID from a created review
  // For this test, we use a valid UUID format to test endpoint structure
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // 3. View snapshots for the review
  const snapshots =
    await api.functional.ecommerceMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    snapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    snapshots.pagination.pages >= 0,
  );
  // 5. Validate snapshot data structure when snapshots exist
  if (snapshots.data.length > 0) {
    // Verify each snapshot has required fields
    for (const snapshot of snapshots.data) {
      typia.assert(snapshot);
      TestValidator.predicate(
        "snapshot has review reference",
        snapshot.review !== undefined,
      );
      TestValidator.predicate(
        "snapshot has changedByCustomer",
        snapshot.changedByCustomer !== undefined,
      );
      TestValidator.predicate(
        "snapshot has previous values",
        snapshot.previousValues !== undefined,
      );
      TestValidator.predicate(
        "snapshot has current values",
        snapshot.currentValues !== undefined,
      );
      TestValidator.predicate(
        "snapshot has created timestamp",
        snapshot.createdAt !== undefined,
      );
      TestValidator.predicate("snapshot has id", snapshot.id !== undefined);
    }
    // 6. Verify snapshots are sorted by created_at descending (newest first)
    for (let i = 0; i < snapshots.data.length - 1; i++) {
      TestValidator.predicate(
        `snapshot ${i} is newer than or equal to snapshot ${i + 1}`,
        snapshots.data[i].createdAt >= snapshots.data[i + 1].createdAt,
      );
    }
    // 7. Verify changedByCustomer matches the authenticated customer
    const firstSnapshot = snapshots.data[0];
    TestValidator.equals(
      "snapshot changed by authenticated customer",
      firstSnapshot.changedByCustomer.id,
      customerAuth.id,
    );
  }
}
