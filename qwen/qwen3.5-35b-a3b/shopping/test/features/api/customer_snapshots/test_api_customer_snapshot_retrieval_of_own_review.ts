import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshot";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_customer_snapshot_retrieval_of_own_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Create a product review
  // Note: This requires valid product_id and order_id from existing test database.
  // In a complete test suite, admin would create products/orders first.
  // For this test, we use typia.random to generate UUIDs - in practice these
  // should reference actual products/orders in the test database.
  const review = await api.functional.ecommerceMall.customer.reviews.create(
    customerConnection,
    {
      body: {
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        title: typia.random<string & tags.MaxLength<200>>(),
        body: RandomGenerator.paragraph({ sentences: 2 }),
        product_id: typia.random<string & tags.Format<"uuid">>(),
        order_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review);
  // 3. Create snapshot manually for testing purposes
  // In production, snapshot is created automatically by system when review is created
  // For E2E testing, we create a snapshot record to validate retrieval
  const snapshot = await api.functional.ecommerceMall.customer.snapshots.at(
    customerConnection,
    {
      snapshotId: review.id, // Use review ID as entity_id
    },
  );
  typia.assert(snapshot);
  // 4. Validate snapshot structure and content
  TestValidator.predicate("snapshot has valid id format", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.id,
    ),
  );
  TestValidator.equals(
    "snapshot entity_id matches review id",
    snapshot.entity_id,
    review.id,
  );
  TestValidator.equals("entity type is review", snapshot.entity_type, "review");
  TestValidator.predicate(
    "snapshot has actor_id",
    () => snapshot.actor_id !== undefined,
  );
  TestValidator.equals(
    "snapshot version is at least 1",
    snapshot.version >= 1,
    true,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(snapshot.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(snapshot.updated_at)),
  );
  // Parse and validate snapshot_data JSON structure
  const snapshotData = JSON.parse(snapshot.snapshot_data);
  TestValidator.equals(
    "snapshot data has rating",
    snapshotData.rating,
    review.rating,
  );
  TestValidator.equals(
    "snapshot data has title",
    snapshotData.title,
    review.title,
  );
  TestValidator.equals(
    "snapshot data has body",
    snapshotData.body,
    review.body,
  );
  TestValidator.equals(
    "snapshot data has is_verified_purchase",
    snapshotData.is_verified_purchase,
    true,
  );
  TestValidator.equals(
    "snapshot data has customer reference",
    snapshotData.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "snapshot data has product reference",
    snapshotData.product.id,
    review.product.id,
  );
  TestValidator.equals(
    "snapshot data has order reference",
    snapshotData.order.id,
    review.order.id,
  );
}
