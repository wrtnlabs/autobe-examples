import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_item_product_snapshot_order_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as administrator
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Generate random UUIDs for non-existent order and order item
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentOrderItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve product snapshot for non-existent order
  // Should throw 404 Not Found error
  await TestValidator.httpError(
    "should return 404 when order does not exist",
    404,
    async () => {
      await api.functional.ecommerceMall.admin.orders.items.productSnapshot.at(
        adminConnection,
        {
          orderId: nonExistentOrderId,
          orderItemId: nonExistentOrderItemId,
        },
      );
    },
  );
}
