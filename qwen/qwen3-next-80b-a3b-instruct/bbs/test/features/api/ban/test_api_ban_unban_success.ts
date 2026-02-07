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

export async function test_api_ban_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // 2. Create citizen user account
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenEmail = typia.random<string & tags.Format<"email">>();
  const citizenPassword = RandomGenerator.alphabets(12);
  const citizenJoinResult = await authorize_citizen_join(citizenConnection, {
    body: {
      email: citizenEmail,
      password: citizenPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(citizenJoinResult);
  // 3. Login as administrator
  await authorize_administrator_login(adminConnection, {
    body: { email: adminEmail } satisfies IEconomicBoardAdministrator.ILogin,
  });
  // 4. Ban the citizen user
  const banRecord =
    await generate_random_economic_board_administrator_bans_create(
      adminConnection,
      {
        body: {
          citizen_id: citizenJoinResult.id, // Use the actual UUID from the join response
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEconomicBoardBan.ICreate,
      },
    );
  // Use typia.assert to properly cast the response to a type that includes the required properties
  const typedBanRecord = typia.assert<IEconomicBoardBan & { banned_at: string; reason: string; citizen_id: string; administrator_id: string; unbanned_at: string | null; id: string }>(banRecord);
  
  // Validate ban record structure
  TestValidator.equals(
    "banned_at should be set",
    typedBanRecord.banned_at !== null,
    true,
  );
  TestValidator.equals("reason should be set", !!typedBanRecord.reason, true);
  TestValidator.equals(
    "citizen_id should match",
    typedBanRecord.citizen_id,
    citizenJoinResult.id,
  );
  TestValidator.equals(
    "administrator_id should be set",
    typedBanRecord.administrator_id !== null,
    true,
  );
  TestValidator.equals(
    "unbanned_at should be null",
    typedBanRecord.unbanned_at === null,
    true,
  );
  // 5. Verify citizen cannot log in after ban (should fail)
  const failedLogin = () =>
    api.functional.economicBoard.auth.citizen.login(citizenConnection, {
      body: { email: citizenEmail } satisfies IEconomicBoardCitizen.ILogin,
    });
  await TestValidator.error(
    "citizen should be banned and unable to login",
    failedLogin,
  );
  // 6. Unban the citizen user
  const unbanResult =
    await api.functional.economicBoard.administrator.bans.update(
      adminConnection,
      {
        banId: typedBanRecord.id,
      },
    );
  const typedUnbanResult = typia.assert<IEconomicBoardBan & { banned_at: string; reason: string; citizen_id: string; administrator_id: string; unbanned_at: string | null; id: string }>(unbanResult);
  
  // 7. Verify ban record was updated with unbanned_at timestamp
  TestValidator.notEquals(
    "unbanned_at should be set",
    typedUnbanResult.unbanned_at,
    null,
  );
  TestValidator.equals(
    "banned_at should be preserved",
    typedUnbanResult.banned_at,
    typedBanRecord.banned_at,
  );
  TestValidator.equals(
    "reason should be preserved",
    typedUnbanResult.reason,
    typedBanRecord.reason,
  );
  TestValidator.equals(
    "citizen_id should be preserved",
    typedUnbanResult.citizen_id,
    typedBanRecord.citizen_id,
  );
  TestValidator.equals(
    "administrator_id should be preserved",
    typedUnbanResult.administrator_id,
    typedBanRecord.administrator_id,
  );
  // 8. Verify citizen can now log in again
  const newCitizenConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_citizen_login(newCitizenConnection, {
    body: { email: citizenEmail } satisfies IEconomicBoardCitizen.ILogin,
  });
  typia.assert(loginResult);
}