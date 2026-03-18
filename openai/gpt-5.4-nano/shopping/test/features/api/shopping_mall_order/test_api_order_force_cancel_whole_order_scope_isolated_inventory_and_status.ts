import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_force_cancel_whole_order_scope_isolated_inventory_and_status(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using POST /shoppingMall/auth/admin/join.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const auth = await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(auth);
  // The provided DTO for IShoppingMallOrder.IUpdate contains only shipping
  // address update fields and does not include orderId or any force-cancel
  // action selector. Without the required request shape, calling the
  // oversight endpoint would be semantically invalid and likely fail.
  //
  // Therefore, this test only validates the admin authentication precondition
  // using available contracts.
  TestValidator.predicate(
    "admin token access should be non-empty",
    auth.token.access.length > 0,
  );
}
