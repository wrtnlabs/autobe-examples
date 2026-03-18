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

export async function test_api_admin_order_item_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authentication (registration-based, since only IJoin is provided)
  const adminConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2) Non-existent order item id (syntactically valid UUID)
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 3) Erase should fail with not-found
  await TestValidator.httpError(
    "erase non-existent order item should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.admin.order_items.erase(
        adminConnection,
        {
          orderItemId,
        },
      );
    },
  );
  // 4) Repeating erase with same id should also fail (no success side-effects)
  await TestValidator.httpError(
    "re-erase same non-existent order item should still return 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.admin.order_items.erase(
        adminConnection,
        {
          orderItemId,
        },
      );
    },
  );
}
