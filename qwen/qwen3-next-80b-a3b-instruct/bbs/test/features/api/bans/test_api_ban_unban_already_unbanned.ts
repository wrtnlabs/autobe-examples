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

export async function test_api_ban_unban_already_unbanned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies IEconomicBoardAdministrator.ILogin,
  });
  // 2. Create a citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(10),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(citizen);
  // 3. Ban the citizen user (using empty body per IEconomicBoardBan.ICreate type)
  const ban = await generate_random_economic_board_administrator_bans_create(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(ban);
  // Extract ban.id via assertion as object with id
  const banId = typia.assert<{ id: string }>(ban).id;
  // 4. Unban the citizen user (mark ban as completed)
  const unban = await api.functional.economicBoard.administrator.bans.update(
    adminConnection,
    {
      banId,
    },
  );
  typia.assert(unban);
  // 5. Attempt to unban the already unbanned user (should return 404)
  await TestValidator.httpError(
    "should return 404 for already unbanned user",
    404,
    async () => {
      await api.functional.economicBoard.administrator.bans.update(
        adminConnection,
        {
          banId,
        },
      );
    },
  );
}