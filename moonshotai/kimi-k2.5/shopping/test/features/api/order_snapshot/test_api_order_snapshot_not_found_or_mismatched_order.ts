import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_snapshot_not_found_or_mismatched_order(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as administrator
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Generate random UUIDs that don't exist in the database
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent snapshot and verify 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent order snapshot",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.orders.snapshots.at(
        adminConnection,
        {
          orderId: nonExistentOrderId,
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
}
