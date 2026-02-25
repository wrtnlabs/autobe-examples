import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
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

export async function test_api_administrator_unban_non_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator user
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // 2. Create citizen user (never banned)
  const citizenPassword = RandomGenerator.alphaNumeric(16);
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenUser = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: citizenPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  // 3. Login as administrator
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminUser.email,
      password: adminPassword,
    } satisfies IEconomicBoardAdministrator.ILogin,
  });
  // 4. Attempt to unban non-banned citizen
  // This should fail with 400 Bad Request and ECONOMICBOARD_USER_NOT_BANNED error
  await TestValidator.httpError(
    "unban non-banned user should return 400 with ECONOMICBOARD_USER_NOT_BANNED",
    400,
    async () => {
      await api.functional.economicBoard.administrator.admin.users._unban.erase(
        adminLoginConnection,
        {
          userId: citizenUser.id,
        },
      );
    },
  );
  // Verify citizen is still not banned
  const citizenConnectionCheck: api.IConnection = { host: connection.host };
  const citizen = await api.functional.economicBoard.auth.citizen.login(
    citizenConnectionCheck,
    {
      body: {
        email: citizenUser.email,
        password: citizenPassword,
      } satisfies IEconomicBoardCitizen.ILogin,
    },
  );
  typia.assert(citizen);
  TestValidator.equals(
    "citizen should still not be banned",
    citizen.is_banned,
    false,
  );
}
