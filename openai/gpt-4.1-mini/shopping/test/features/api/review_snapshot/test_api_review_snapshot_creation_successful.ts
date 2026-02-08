import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_review_snapshots_create } from "../../../generate/generate_random_shopping_mall_review_snapshots_create";
import { prepare_random_shopping_mall_review_snapshot } from "../../../prepare/prepare_random_shopping_mall_review_snapshot";

export async function test_api_review_snapshot_creation_successful(
  connection: api.IConnection,
): Promise<void> {
  // Test creating a new immutable review snapshot for an existing review with valid rating and optional text
  // 1. Register a new customer and authorize
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a new review snapshot with valid rating and optional text
  // Prepare dummy review_id to test creation
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const createBody = {
    review_id: reviewId,
    rating: 5,
    text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallReviewSnapshot.ICreate;
  // Create the review snapshot using the utility generate_random_shopping_mall_review_snapshots_create
  const rawSnapshot = await generate_random_shopping_mall_review_snapshots_create(
    customerConnection,
    { body: createBody },
  );
  // We assert the rawSnapshot to validate structure
  typia.assert(rawSnapshot);
  // Cast rawSnapshot to any to access properties that might not be declared in interface
  const snapshot = rawSnapshot as any;
  TestValidator.equals("review_id matches", snapshot.review_id, reviewId);
  // Check that timestamp fields exist and appear as ISO date-time strings
  for (const field of [
    "created_at",
    "updated_at",
    "snapshot_created_at",
  ] as const) {
    const ts = snapshot[field];
    TestValidator.predicate(
      `${field} is valid ISO8601`,
      typeof ts === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(ts),
    );
  }
  // 3. Negative test: attempt to create snapshot with non-existing review ID
  const invalidCreateBody = {
    review_id: typia.random<string & tags.Format<"uuid">>(),
    rating: 4,
    text: "Invalid review id, should be rejected.",
  } satisfies IShoppingMallReviewSnapshot.ICreate;
  await TestValidator.error(
    "create with non-existing review_id should fail",
    async () => {
      await generate_random_shopping_mall_review_snapshots_create(
        customerConnection,
        {
          body: invalidCreateBody,
        },
      );
    },
  );
}
