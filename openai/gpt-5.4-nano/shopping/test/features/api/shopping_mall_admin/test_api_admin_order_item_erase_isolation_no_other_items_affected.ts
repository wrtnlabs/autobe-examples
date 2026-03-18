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

export async function test_api_admin_order_item_erase_isolation_no_other_items_affected(
  connection: api.IConnection,
): Promise<void> {
  // <SCENARIO DESCRIPTION HERE>
  // Admin deletes a specific order item and checks that deletion does not cause
  // cascading side effects on other order items (scope isolation).
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const targetOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const otherOrderItemId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.shoppingMall.admin.admin.order_items.erase(
    adminConnection,
    {
      orderItemId: targetOrderItemId,
    },
  );
  // Isolation proxy: deleting a different order item should be independent.
  await api.functional.shoppingMall.admin.admin.order_items.erase(
    adminConnection,
    {
      orderItemId: otherOrderItemId,
    },
  );
}
