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

export async function test_api_admin_ban_citizen_with_valid_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account via join (utility function)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: IEconomicBoardAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  // 2. Generate a complete citizen entity to use as the basis for banning
  const citizenEntity: IEconomicBoardCitizen =
    typia.random<IEconomicBoardCitizen>();
  const userId: string = citizenEntity.id;
  // 3. Define ban reason (at least 10 characters)
  const banReason: string = RandomGenerator.paragraph({ sentences: 2 }); // Guaranteed > 10 chars
  // 4. Prepare ban body with complete citizen entity
  const banBody: IEconomicBoardCitizen = {
    ...citizenEntity, // Copy all existing citizen properties
    is_banned: true, // Update is_banned to true
    ban_reason: banReason, // Set the ban reason
  };
  // 5. Execute ban
  const bannedCitizen =
    await api.functional.economicBoard.administrator.users.ban(
      adminConnection,
      {
        userId,
        body: banBody,
      },
    );
  // Validate response type using typia.assert
  typia.assert<IEconomicBoardCitizen>(bannedCitizen);
  // 6. Validate ban result
  TestValidator.equals("is_banned is true", bannedCitizen.is_banned, true);
  TestValidator.equals(
    "ban_reason matches",
    bannedCitizen.ban_reason,
    banReason,
  );
  TestValidator.predicate(
    "ban_reason has at least 10 characters",
    bannedCitizen.ban_reason!.length >= 10,
  );
}
