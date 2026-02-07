import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardBan";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardBan";
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

export async function test_api_administrator_ban_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
  } satisfies IEconomicBoardAdministrator.IJoin;
  await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  // 2. Create citizen account to be banned
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenEmail = typia.random<string & tags.Format<"email">>();
  const citizenDisplayName = RandomGenerator.name();
  const citizenCredentials = {
    email: citizenEmail,
    password: "CitizenPass456!",
    display_name: citizenDisplayName,
    bio: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IEconomicBoardCitizen.IJoin;
  const citizenAuth = await authorize_citizen_join(citizenConnection, {
    body: citizenCredentials,
  });
  typia.assert(citizenAuth);
  // 3. Login as administrator
  const adminLogin = {
    email: adminCredentials.email,
  } satisfies IEconomicBoardAdministrator.ILogin;
  const adminAuth = await authorize_administrator_login(adminConnection, {
    body: adminLogin,
  });
  // connection.headers.Authorization is now updated
  // 4. Ban the citizen using utility function
  const banReason = RandomGenerator.paragraph({ sentences: 3 });
  const banPayload = {
    citizen_id: citizenAuth.id,
    reason: banReason,
  } satisfies IEconomicBoardBan.ICreate;
  // Use required utility function for ban creation
  await generate_random_economic_board_administrator_bans_create(
    adminConnection,
    {
      body: banPayload,
    },
  );
  // 5. Retrieve the ban list
  const requestPayload = {} satisfies IEconomicBoardBan.IRequest;
  const banList = await api.functional.economicBoard.administrator.bans.patch(
    adminConnection,
    {
      body: requestPayload,
    },
  );
  typia.assert(banList);
  // 6. Validate pagination structure — not individual ISum properties because empty
  TestValidator.equals("pagination limit is 20", banList.pagination.limit, 20);
  TestValidator.predicate(
    "pagination current is at least 1",
    banList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records is at least 1",
    banList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    banList.pagination.pages >= 1,
  );
  TestValidator.equals("data length is 1", banList.data.length, 1);
}
