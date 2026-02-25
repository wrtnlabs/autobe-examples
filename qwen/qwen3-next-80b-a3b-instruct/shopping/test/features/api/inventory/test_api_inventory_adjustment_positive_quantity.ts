import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_inventory_adjustment_positive_quantity(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // Generate random variant ID based on UUID format
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // Create adjustment request with positive quantity
  const adjustmentBody: IShoppingMallInventoryLog.IAdjust = {
    quantity: 50 satisfies number & tags.Type<"int32">,
    reason: "adjustment" as const,
  };
  // Perform inventory adjustment
  await api.functional.shoppingMall.admin.inventory.adjust(adminConnection, {
    variantId,
    body: adjustmentBody,
  });
}
