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

export async function test_api_administrator_refund_request_snapshot_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password1234",
  } satisfies IShoppingMallAdministrator.IJoin;
  const admin = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(admin);
  // Step 2. Create a refund request snapshot successfully
  const snapshotCreate1 =
    await generate_random_shopping_mall_administrator_refund_request_snapshots_create(
      adminConnection,
      {
        body: {
          shoppingMallRefundRequestId: typia.random<
            string & tags.Format<"uuid">
          >(),
          status: "pending",
          reason: "Requesting refund for a defective product.",
          comment: "Initial refund request snapshot.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      },
    );
  typia.assert(snapshotCreate1);
  // Step 3. Validate the created snapshot fields
  TestValidator.predicate(
    "snapshot ID present",
    typeof snapshotCreate1.id === "string" && snapshotCreate1.id.length > 0,
  );
  TestValidator.predicate(
    "refund request ID present",
    typeof snapshotCreate1.shoppingMallRefundRequestId === "string" &&
      snapshotCreate1.shoppingMallRefundRequestId.length > 0,
  );
  TestValidator.equals(
    "status is 'pending'",
    snapshotCreate1.status,
    "pending",
  );
  TestValidator.equals(
    "reason matches",
    snapshotCreate1.reason,
    "Requesting refund for a defective product.",
  );
  TestValidator.equals(
    "comment matches",
    snapshotCreate1.comment ?? null,
    "Initial refund request snapshot.",
  );
  TestValidator.predicate(
    "createdAt is ISO string",
    typeof snapshotCreate1.createdAt === "string" &&
      snapshotCreate1.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is ISO string",
    typeof snapshotCreate1.updatedAt === "string" &&
      snapshotCreate1.updatedAt.length > 0,
  );
  TestValidator.equals("deletedAt is null", snapshotCreate1.deletedAt, null);
  // Step 4. Create a snapshot with the same refund request ID and status to test immutability (should create a distinct record)
  const snapshotCreate2 =
    await generate_random_shopping_mall_administrator_refund_request_snapshots_create(
      adminConnection,
      {
        body: {
          shoppingMallRefundRequestId:
            snapshotCreate1.shoppingMallRefundRequestId,
          status: snapshotCreate1.status,
          reason: "Requesting refund for a defective product, updated.",
          comment: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      },
    );
  typia.assert(snapshotCreate2);
  // Step 5. Validate the new snapshot is distinct and fields differ where expected
  TestValidator.notEquals("IDs differ", snapshotCreate1.id, snapshotCreate2.id);
  TestValidator.equals(
    "refund request ID matches",
    snapshotCreate1.shoppingMallRefundRequestId,
    snapshotCreate2.shoppingMallRefundRequestId,
  );
  TestValidator.equals(
    "status is 'pending'",
    snapshotCreate2.status,
    "pending",
  );
  TestValidator.notEquals(
    "reason differs",
    snapshotCreate1.reason,
    snapshotCreate2.reason,
  );
  TestValidator.equals(
    "comment is null",
    snapshotCreate2.comment ?? null,
    null,
  );
  // Step 6. Attempt to create a snapshot without authentication, expect failure
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("should fail unauthorized", async () => {
    await generate_random_shopping_mall_administrator_refund_request_snapshots_create(
      unauthenticatedConnection,
      {
        body: {
          shoppingMallRefundRequestId: typia.random<
            string & tags.Format<"uuid">
          >(),
          status: "pending",
          reason: "Unauthorized attempt",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      },
    );
  });
  // Step 7. Attempt to create a snapshot with incomplete data (missing required "status"), expect failure
  await TestValidator.error("should fail missing status", async () => {
    await generate_random_shopping_mall_administrator_refund_request_snapshots_create(
      adminConnection,
      {
        body: {
          shoppingMallRefundRequestId: typia.random<
            string & tags.Format<"uuid">
          >(),
          // status missing here intentionally
          reason: "Missing status field",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        } as any,
      },
    );
  });
}
