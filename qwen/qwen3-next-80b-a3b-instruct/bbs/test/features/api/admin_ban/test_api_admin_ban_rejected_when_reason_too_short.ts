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

export async function test_api_admin_ban_rejected_when_reason_too_short(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEconomicBoardAdministrator.IJoin;
  const admin = await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // 2. Create citizen user to ban
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenEmail = typia.random<string & tags.Format<"email">>();
  const citizenPassword = RandomGenerator.alphaNumeric(16);
  await authorize_administrator_join(citizenConnection, {
    body: { email: citizenEmail, password: citizenPassword },
  });
  // 3. Get citizen ID
  const citizenResponse =
    await api.functional.economicBoard.auth.administrator.join(
      citizenConnection,
      {
        body: { email: citizenEmail, password: citizenPassword },
      },
    );
  typia.assert(citizenResponse);
  const citizenId = citizenResponse.id;
  // 4. Try to ban with reason shorter than 10 characters (invalid)
  const tooShortReason = "Short"; // Only 6 characters
  // Create a complete IEconomicBoardCitizen object with all required properties
  const citizenData = typia.random<IEconomicBoardCitizen>();
  // Override only the fields we need to test
  const banBody = {
    ...citizenData,
    is_banned: true,
    ban_reason: tooShortReason,
  } satisfies IEconomicBoardCitizen;
  // 5. Expect HTTP 400 error for invalid reason length
  await TestValidator.httpError(
    "should reject ban with reason shorter than 10 characters",
    400,
    async () => {
      await api.functional.economicBoard.administrator.users.ban(
        adminConnection,
        {
          userId: citizenId,
          body: banBody,
        },
      );
    },
  );
  // 6. Verify citizen is still not banned (status unchanged)
  const updatedCitizen =
    await api.functional.economicBoard.auth.administrator.join(
      citizenConnection,
      {
        body: { email: citizenEmail, password: citizenPassword },
      },
    );
  typia.assert(updatedCitizen);
  TestValidator.equals(
    "citizen should remain unbanned",
    updatedCitizen.is_banned,
    false,
  );
  TestValidator.equals(
    "ban reason should be null",
    updatedCitizen.ban_reason,
    null,
  );
}
