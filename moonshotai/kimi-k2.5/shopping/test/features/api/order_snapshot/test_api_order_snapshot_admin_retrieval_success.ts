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

export async function test_api_order_snapshot_admin_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate as administrator
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 3. Generate random UUIDs for order and snapshot
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve the order snapshot
  const snapshot = await api.functional.ecommerceMall.admin.orders.snapshots.at(
    adminConnection,
    {
      orderId,
      snapshotId,
    },
  );
  // 5. Validate response structure (typia validates all type constraints including date-time format)
  typia.assert(snapshot);
  // 6. Verify snapshot data integrity - snapshot belongs to the specified order
  TestValidator.equals("snapshot ID matches request", snapshot.id, snapshotId);
  TestValidator.equals("order ID matches request", snapshot.orderId, orderId);
}
