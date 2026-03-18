import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_erase_not_found_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2) Guaranteed non-existent orderId
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 3) First erase should fail with not-found style error
  await TestValidator.httpError(
    "erase missing order should return not-found",
    404,
    async () => {
      await api.functional.shoppingMall.admin.admin.orders.erase(
        adminConnection,
        { orderId },
      );
    },
  );
  // 4) Second erase with same orderId should be idempotent and fail
  await TestValidator.httpError(
    "erase missing order should be idempotent",
    404,
    async () => {
      await api.functional.shoppingMall.admin.admin.orders.erase(
        adminConnection,
        { orderId },
      );
    },
  );
}
