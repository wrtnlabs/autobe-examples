import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_refund_request_snapshots_create } from "../../../generate/generate_random_shopping_mall_administrator_refund_request_snapshots_create";
import { prepare_random_shopping_mall_refund_request_snapshot } from "../../../prepare/prepare_random_shopping_mall_refund_request_snapshot";

export async function test_api_administrator_refund_request_snapshot_lifecycle_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Update token by authorization
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Generate a fixed refund request ID to simulate snapshots lifecycle
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare multiple status snapshots for the same refund request
  const statuses = ["pending", "approved", "rejected"] as const;
  const snapshots: IShoppingMallRefundRequestSnapshot[] = [];
  // 4. Create snapshots sequentially simulating lifecycle changes
  for (const status of statuses) {
    // Random timestamps: createdAt <= updatedAt
    const createdAt = RandomGenerator.date(
      new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      1000 * 60 * 60 * 24 * 6,
    ).toISOString();
    const updatedAt = new Date(
      new Date(createdAt).getTime() + randint(0, 1000 * 60 * 60),
    ).toISOString();
    // Comment sometimes null or undefined
    const comment =
      Math.random() < 0.5 ? RandomGenerator.paragraph({ sentences: 2 }) : null;
    const body: IShoppingMallRefundRequestSnapshot.ICreate = {
      shoppingMallRefundRequestId: refundRequestId,
      status: status,
      reason: `Test refund reason for status ${status}`,
      comment: comment,
      createdAt: createdAt,
      updatedAt: updatedAt,
      deletedAt: null,
    };
    // Create the refund request snapshot by utility function
    const snapshot =
      await generate_random_shopping_mall_administrator_refund_request_snapshots_create(
        adminConnection,
        { body },
      );
    typia.assert(snapshot);
    snapshots.push(snapshot);
  }
  // 5. Verify that multiple snapshots for the same refund request ID are distinct and saved
  const distinctSnapshotIds = new Set(snapshots.map((v) => v.id));
  TestValidator.predicate(
    `different snapshot ids for each status`,
    distinctSnapshotIds.size === snapshots.length,
  );
  // 6. Check timestamps and logical consistency
  for (const snapshot of snapshots) {
    TestValidator.predicate(
      `snapshot createdAt <= updatedAt for id ${snapshot.id}`,
      snapshot.createdAt <= snapshot.updatedAt,
    );
    // Confirm comment can be null or string
    TestValidator.predicate(
      `comment nullable or string for id ${snapshot.id}`,
      snapshot.comment === null || typeof snapshot.comment === "string",
    );
  }
}
