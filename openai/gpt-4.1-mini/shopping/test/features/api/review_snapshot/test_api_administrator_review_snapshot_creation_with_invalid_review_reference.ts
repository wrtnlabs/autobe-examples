import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_review_snapshots_create_review_snapshot } from "../../../generate/generate_random_shopping_mall_administrator_review_snapshots_create_review_snapshot";
import { prepare_random_shopping_mall_review_snapshot } from "../../../prepare/prepare_random_shopping_mall_review_snapshot";

export async function test_api_administrator_review_snapshot_creation_with_invalid_review_reference(
  connection: api.IConnection,
): Promise<void> {
  // Test that the creation of a review snapshot fails gracefully when attempting to create a snapshot for a non-existent product review ID.
  // The test should authenticate as administrator, and provide an invalid shoppingMallProductReviewId in the snapshot creation payload.
  // Validate proper error handling and meaningful error message without crashing the system.
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Attempt to create a review snapshot with an invalid shoppingMallProductReviewId
  const invalidReviewId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date().toISOString();
  const invalidSnapshotBody: IShoppingMallReviewSnapshot.ICreate = {
    shoppingMallProductReviewId: invalidReviewId,
    rating: 3,
    body: null,
    snapshotCreatedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  // 3. Expect an error on creating snapshot with invalid review reference
  await TestValidator.error(
    "create review snapshot with invalid shoppingMallProductReviewId",
    async () => {
      await api.functional.shoppingMall.administrator.reviewSnapshots.createReviewSnapshot(
        adminConnection,
        { body: invalidSnapshotBody },
      );
    },
  );
}
