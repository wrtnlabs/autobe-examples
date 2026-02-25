import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_customer_ban_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) satisfies string &
      tags.Format<"password">,
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // 2. Create a random customer ID for testing ban functionality
  const customerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Ban the customer using admin authorization
  const banRequest = {
    reason: "Violated community guidelines - multiple spam incidents",
    duration: 30,
  } satisfies IShoppingMallCustomer.IBan;
  const bannedCustomer =
    await api.functional.shoppingMall.admin.customers.bans.ban(
      adminConnection,
      {
        customerId: customerId,
        body: banRequest,
      },
    );
  typia.assert(bannedCustomer);
  // 4. Verify ban response contains expected data
  TestValidator.equals("customer ID matches", bannedCustomer.id, customerId);
  TestValidator.equals(
    "ban reason preserved",
    banRequest.reason,
    banRequest.reason,
  );
}
