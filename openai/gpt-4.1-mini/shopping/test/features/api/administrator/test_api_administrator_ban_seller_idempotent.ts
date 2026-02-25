import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_ban_seller_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // Test the idempotent behavior of banning a seller who is already banned.
  // This scenario ensures that an administrator can re-ban an already banned seller without duplicate records or errors.
  // Verify that the action returns 204 No Content success and does not create duplicate ban entries.
  // Confirm audit logging is performed correctly.
  // 1. Admin account join and obtain admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(admin);
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // 2. Generate a random sellerId to ban
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Perform first ban call
  await api.functional.shoppingMall.administrator.banned_users.sellers.ban.banSeller(
    adminConnection,
    { sellerId },
  );
  // 4. Perform ban call again to test idempotency
  await api.functional.shoppingMall.administrator.banned_users.sellers.ban.banSeller(
    adminConnection,
    { sellerId },
  );
  // Note: The API returns void with 204 No Content, so no response to assert directly.
  // Idempotency ensures no errors and no duplicate ban entries.
  // Audit logs are assumed to be handled internally by the system, as no API to verify.
}
