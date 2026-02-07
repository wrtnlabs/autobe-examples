import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardBan";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_board_administrator_bans_create } from "../../../generate/generate_random_economic_board_administrator_bans_create";
import { prepare_random_economic_board_ban } from "../../../prepare/prepare_random_economic_board_ban";

export async function test_api_citizen_refresh_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new citizen account
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IEconomicBoardCitizen.IJoin;
  await authorize_citizen_join(citizenConnection, { body: citizenData });
  // 2. Log in as the citizen to establish a refresh token
  const loginResponse = await authorize_citizen_login(citizenConnection, {
    body: {} satisfies IEconomicBoardCitizen.ILogin,
  });
  typia.assert(loginResponse);
  // 3. Create an administrator account for banning
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_administrator_join(adminConnection, {
    body: {} satisfies IEconomicBoardAdministrator.IJoin,
  });
  // 4. Log in as the administrator
  await authorize_administrator_login(adminConnection, {
    body: { email: adminEmail } satisfies IEconomicBoardAdministrator.ILogin,
  });
  // 5. Ban the citizen account using the administrator connection
  await generate_random_economic_board_administrator_bans_create(
    adminConnection,
    {
      body: {} satisfies IEconomicBoardBan.ICreate,
    },
  );
  // 6. Refresh token with the banned citizen's connection
  // This should fail with authentication error
  await TestValidator.error(
    "refresh should fail for banned citizen",
    async () => {
      await authorize_citizen_refresh(citizenConnection, {
        body: {} satisfies IEconomicBoardCitizen.IRefresh,
      });
    },
  );
}
