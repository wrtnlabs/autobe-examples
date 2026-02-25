import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_snapshot_retrieval_valid(
  connection: api.IConnection,
): Promise<void> {
  // Auth as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdmin.IJoin,
  });
  // Generate valid UUIDs for order and snapshot IDs
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve snapshot with actor-specific connection
  const snapshot = await api.functional.ecommerce.admin.orders.snapshots.at(
    adminConnection,
    {
      orderId,
      snapshotId,
    },
  );
  typia.assert(snapshot);
  // Validate business logic
  TestValidator.equals(
    "snapshot order ID matches requested ID",
    snapshot.order.id,
    orderId,
  );
  TestValidator.notEquals(
    "order status exists",
    snapshot.order.status,
    undefined,
  );
  TestValidator.predicate(
    "total amount is positive",
    snapshot.order.total_amount > 0,
  );
}
