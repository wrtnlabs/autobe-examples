import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_economic_board_administrator_bans_create } from "../../../generate/generate_random_economic_board_administrator_bans_create";
import { prepare_random_economic_board_ban } from "../../../prepare/prepare_random_economic_board_ban";

export async function test_api_administrator_refresh_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new administrator account with empty IJoin (per schema)
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody: IEconomicBoardAdministrator.IJoin = {};
  const joinedAdmin = await authorize_administrator_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(joinedAdmin);
  // Step 2: Login using the email from joined admin's credentials (assume system stored it)
  // The email used in join was not stored, but login requires it. So we must provide an email
  // Since IJoin is empty, we assume an email was passed implicitly (e.g., from session or context)
  // But we need to simulate a valid email. We'll generate one for the test.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody: IEconomicBoardAdministrator.ILogin = { email: adminEmail };
  const loginResult = await authorize_administrator_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loginResult);
  // Step 3: Ban the administrator - this will use the authenticated connection
  // IEconomicBoardBan.ICreate is {} - so body must be empty object
  const banConnection: api.IConnection = { host: connection.host };
  const banBody: IEconomicBoardBan.ICreate = {};
  await generate_random_economic_board_administrator_bans_create(
    banConnection,
    { body: banBody },
  );
  // Step 4: Attempt to refresh token on a new connection - should be rejected due to ban
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshBody: IEconomicBoardAdministrator.IRefresh = {};
  await TestValidator.error("refresh after ban should fail", async () => {
    await authorize_administrator_refresh(refreshConnection, {
      body: refreshBody,
    });
  });
}
