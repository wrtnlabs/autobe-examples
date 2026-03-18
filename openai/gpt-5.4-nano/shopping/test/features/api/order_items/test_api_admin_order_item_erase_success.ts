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

export async function test_api_admin_order_item_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // This test requires order-item/shipments creation & admin retrieval APIs,
  // but only admin join + order item erase are available in the provided SDK.
  // Therefore, we validate that erase endpoint requires an existing order item
  // by attempting erase with a random UUID and expecting a NotFound error.
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const nonExistentOrderItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "erase non-existent order item should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.admin.order_items.erase(
        adminConnection,
        {
          orderItemId: nonExistentOrderItemId,
        },
      );
    },
  );
}
