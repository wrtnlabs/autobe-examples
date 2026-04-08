import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that administrator receives 404 when requesting a snapshot with a refund request ID that doesn't match the snapshot's parent.
 *
 * Validates the referential integrity between refund request snapshots and their parent refund requests. The endpoint ensures that snapshots can only be accessed through their correct parent refund request context, preventing unauthorized or incorrect data access even for administrators.
 *
 * 1. Administrator authenticates via admin join endpoint with randomized credentials and grade level.
 * 2. Administrator calls GET endpoint with mismatched refund request ID and snapshot ID (two different random UUIDs).
 * 3. Verifies response returns 404 Not Found indicating the snapshot doesn't belong to the specified refund request or doesn't exist.
 *
 * Business Logic:
 * - The endpoint validates that the snapshot's parent refund request ID matches the path parameter.
 * - Prevents accessing snapshots through incorrect refund request context.
 * - Ensures data consistency and proper scoping of snapshot queries.
 * - Even administrators cannot bypass the parent-child relationship validation.
 */
export async function test_api_refund_request_snapshot_mismatched_refund_request_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate mismatched UUIDs for refund request and snapshot
  // Using two different random UUIDs ensures they don't match any real parent-child relationship
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify 404 error is returned when accessing snapshot with mismatched refund request ID
  await TestValidator.httpError(
    "mismatched refund request ID returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.refund_requests.snapshots.at(
        adminConnection,
        {
          refundRequestId,
          snapshotId,
        },
      );
    },
  );
}
