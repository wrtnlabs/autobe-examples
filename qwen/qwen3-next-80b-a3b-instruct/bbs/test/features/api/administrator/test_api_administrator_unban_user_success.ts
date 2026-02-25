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

export async function test_api_administrator_unban_user_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account with join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEconomicBoardAdministrator.IJoin;
  await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  // 2. Create regular citizen user to ban (using administrator join as the only available method)
  // Note: The API only provides administrator endpoints, so we'll use the same method
  // to create a user account that can be banned. The citizen user is created by
  // joining as an administrator, but will be treated as a citizen account.
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenEmail = typia.random<string & tags.Format<"email">>();
  const citizenPassword = RandomGenerator.alphaNumeric(16);
  const citizenJoinResponse = await authorize_administrator_join(
    citizenConnection,
    {
      body: {
        email: citizenEmail,
        password: citizenPassword,
      } satisfies IEconomicBoardAdministrator.IJoin,
    },
  );
  typia.assert(citizenJoinResponse);
  const userId = citizenJoinResponse.id;
  // 3. Authenticate as administrator
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies IEconomicBoardAdministrator.ILogin,
  });
  // 4. Ban the citizen user
  await api.functional.economicBoard.administrator.admin.users.ban(
    adminConnection,
    {
      userId,
      body: {
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEconomicBoardCitizen.IBanReason,
    },
  );
  // 5. Execute unban operation
  const unbannedUserResponse =
    await api.functional.economicBoard.administrator.admin.users._unban.erase(
      adminConnection,
      {
        userId,
      },
    );
  typia.assert(unbannedUserResponse);
  // 6. Verify unban was successful: user is now active (is_banned = false, ban_reason = null)
  TestValidator.equals(
    "user should be unbanned",
    unbannedUserResponse.is_banned,
    false,
  );
  TestValidator.equals(
    "ban_reason should be cleared",
    unbannedUserResponse.ban_reason,
    null,
  );
  // 7. Verify the user's status is updated correctly
  TestValidator.predicate(
    "user has active status",
    () => !unbannedUserResponse.is_banned,
  );
  TestValidator.predicate(
    "user has valid email",
    () => unbannedUserResponse.email !== null,
  );
  TestValidator.predicate(
    "user has valid created_at",
    () => new Date(unbannedUserResponse.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "user has valid updated_at",
    () => new Date(unbannedUserResponse.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "user id matches expected",
    unbannedUserResponse.id,
    userId,
  );
}
