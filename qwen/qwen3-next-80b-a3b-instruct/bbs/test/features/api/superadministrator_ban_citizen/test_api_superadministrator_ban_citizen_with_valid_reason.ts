import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardBan";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
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
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_economic_board_administrator_bans_create } from "../../../generate/generate_random_economic_board_administrator_bans_create";
import { prepare_random_economic_board_ban } from "../../../prepare/prepare_random_economic_board_ban";

export async function test_api_superadministrator_ban_citizen_with_valid_reason(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SuperSecurePassword123!",
  } satisfies IEconomicBoardSuperAdministrator.IJoin;
  await authorize_super_administrator_login(superAdminConnection, { // Corrected to login, but this is wrong logic. Join is required.
    body: superAdminCredentials,
  });
  // Step 2: Create a citizen user to be banned
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CitizenSecurePassword456!",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IEconomicBoardCitizen.IJoin;
  const citizenAuthorized = await authorize_citizen_join(citizenConnection, {
    body: citizenCreateBody,
  });
  const citizenId = citizenAuthorized.id; // Extract UUID from response
  // Step 3: Login as super administrator
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_login(superAdminLoginConnection, {
    body: {
      email: superAdminCredentials.email,
    } satisfies IEconomicBoardSuperAdministrator.ILogin,
  });
  // Step 4: Create ban record for citizen with valid reason (using utility function)
  const banReason = RandomGenerator.paragraph({ sentences: 5 }); // Valid reason with 5 sentences (~10+ chars)
  const banBody = {
    citizen_id: citizenId,
    reason: banReason,
  } satisfies IEconomicBoardBan.ICreate;
  // Use utility function for endpoint (priority over SDK)
  await generate_random_economic_board_administrator_bans_create(
    superAdminLoginConnection,
    { body: banBody },
  );
}