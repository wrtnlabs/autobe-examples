import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator receives 404 when retrieving non-existent order item snapshot.
 *
 * Validates that the system properly handles requests for order item snapshots that do not exist in the database. The test ensures that administrators receive appropriate error responses when attempting to access invalid snapshot resources, maintaining system integrity and preventing information leakage about snapshot ID patterns.
 *
 * This test verifies the 404 Not Found response is returned for valid UUID format identifiers that do not correspond to any existing snapshot record. The snapshot ID is randomly generated to ensure it does not exist in the system.
 *
 * 1. Administrator account is created and authenticated via join operation.
 * 2. Administrator attempts to retrieve a snapshot with a random valid UUID.
 * 3. Validates that the API returns HTTP 404 Not Found status.
 * 4. Confirms the error response contains appropriate error information.
 */
export async function test_api_order_item_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate a valid but non-existent snapshot ID
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent snapshot and validate 404 response
  await TestValidator.httpError(
    "non-existent snapshot returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.admin.order_item_snapshots.at(
        adminConnection,
        {
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
}
