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
 * Test administrator retrieval of refund request snapshot by ID.
 *
 * Validates that an administrator can successfully retrieve a specific refund request snapshot using the snapshot ID and refund request ID. This test ensures the admin has platform-wide access to view refund request snapshots for audit and dispute resolution purposes.
 *
 * The test verifies that the snapshot response contains all required fields including the refund request reference, status, customer reason, seller response details, and creation timestamp. All data must conform to the IShoppingMallRefundRequestSnapshot DTO structure.
 *
 * 1. Administrator authenticates using authorize_admin_join utility.
 * 2. Administrator retrieves snapshot using valid refund request and snapshot IDs.
 * 3. Validates response structure and field values match expected DTO schema.
 * 4. Confirms refundRequestId in response matches the path parameter.
 */
export async function test_api_refund_request_snapshot_retrieval_by_admin(
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
  // 2. Generate valid UUIDs for refund request and snapshot
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve refund request snapshot
  const snapshot =
    await api.functional.shoppingMall.admin.refund_requests.snapshots.at(
      adminConnection,
      {
        refundRequestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate business logic (typia.assert() handles type validation)
  TestValidator.equals(
    "refundRequestId matches path parameter",
    snapshot.refundRequestId,
    refundRequestId,
  );
  TestValidator.predicate(
    "reason is non-empty string",
    snapshot.reason.length > 0,
  );
  if (snapshot.sellerResponseComment !== null) {
    TestValidator.predicate(
      "sellerResponseComment is non-empty string",
      snapshot.sellerResponseComment.length > 0,
    );
  }
}
