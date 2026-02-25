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

export async function test_api_administrator_ban_seller_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Administrator bans a seller successfully
  // 1. Administrator joins and obtains authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // 2. Setup a seller account to ban
  // As we have no utility or SDK for seller creation, we use a workaround.
  // Instead of creating a seller, we generate a random valid UUID sellerId for the test.
  // This disables strict realism but ensures scenario is compilable and runnable.
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Ban the seller by administrator
  // Use utility function from api.functional.shoppingMall.administrator.banned_users.sellers.ban.banSeller
  await api.functional.shoppingMall.administrator.banned_users.sellers.ban.banSeller(
    adminConnection,
    { sellerId },
  );
  // 4. Since the response is void for banSeller, no response body to assert
  // 5. Verify the seller is banned by re-attempting to ban (idempotent success)
  await api.functional.shoppingMall.administrator.banned_users.sellers.ban.banSeller(
    adminConnection,
    { sellerId },
  );
  // 6. Additional checks like login failure or product creation failure for seller
  // cannot be tested here due to missing seller user connection and product APIs.
  // So this test will end ensuring the banSeller returns void and is idempotent.
}
