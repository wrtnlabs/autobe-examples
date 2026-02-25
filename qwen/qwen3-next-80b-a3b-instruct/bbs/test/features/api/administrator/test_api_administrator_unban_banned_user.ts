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

export async function test_api_administrator_unban_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "securePassword123",
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Create a user to ban (use admin registration as citizen user proxy since no citizen endpoint exists)
  const citizenEmail = typia.random<string & tags.Format<"email">>();
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_administrator_join(citizenConnection, {
    body: {
      email: citizenEmail,
      password: "citizenPassword123",
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  typia.assert(citizen);
  // Capture citizen's original state
  const citizenOriginal = citizen;
  // 3. Ban the citizen user
  const banConnection: api.IConnection = { host: connection.host };
  banConnection.headers = adminConnection.headers; // Use admin's authorization
  const banReason = {
    reason: "Test ban reason for unban testing",
  } satisfies IEconomicBoardCitizen.IBanReason;
  await api.functional.economicBoard.administrator.admin.users.ban(
    banConnection,
    {
      userId: citizen.id,
      body: banReason,
    },
  );
  // 4. Unban the previously banned user
  const unbanConnection: api.IConnection = { host: connection.host };
  unbanConnection.headers = adminConnection.headers; // Use admin's authorization
  const unbanResponse: IEconomicBoardCitizen =
    await api.functional.economicBoard.administrator.admin.users.unban(
      unbanConnection,
      {
        userId: citizen.id,
      },
    );
  typia.assert(unbanResponse);
  // 5. Validate unban response
  TestValidator.equals(
    "user should be unbanned",
    unbanResponse.is_banned,
    false,
  );
  TestValidator.equals(
    "ban_reason should be cleared",
    unbanResponse.ban_reason,
    null,
  );
  TestValidator.predicate(
    "user id matches",
    () => unbanResponse.id === citizen.id,
  );
  TestValidator.notEquals(
    "updated_at should be updated after unban",
    unbanResponse.updated_at,
    citizenOriginal.updated_at,
  );
}
