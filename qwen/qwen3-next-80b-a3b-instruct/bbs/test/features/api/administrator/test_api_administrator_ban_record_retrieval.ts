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

export async function test_api_administrator_ban_record_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // Create citizen account
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  // Login as administrator
  const adminLoginResponse = await authorize_administrator_login(
    adminConnection,
    {
      body: {
        email: typia.assert<string>(
          adminConnection.headers?.Authorization?.toString()
            .split(" ")[1]
            ?.split(".")[0],
        ),
      } satisfies IEconomicBoardAdministrator.ILogin,
    },
  );
  // Ban the citizen account - using generate utility to create ban
  const banRecord =
    await generate_random_economic_board_administrator_bans_create(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(banRecord);
  // Cast the banRecord to IEconomicBoardBan & IEntity to safely access the id property
  // This works because the actual instance has an id property as per the API spec
  const banId = (banRecord as IEconomicBoardBan & IEntity).id;
  // Retrieve the ban record
  const retrievedBan = await api.functional.economicBoard.administrator.bans.at(
    adminConnection,
    { banId },
  );
  typia.assert(retrievedBan);
  // No property validation needed since IEconomicBoardBan is empty
  // The successful retrieval and type assertion validate the operation
}
