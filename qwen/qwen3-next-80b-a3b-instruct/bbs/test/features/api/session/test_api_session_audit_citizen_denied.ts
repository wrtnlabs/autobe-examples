import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorSession";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_session_audit_citizen_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create citizen account
  const citizenConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const joinResponse = await authorize_citizen_join(citizenConnection, {
    body: {
      email,
      password: "securePassword123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Log in as citizen to establish valid session
  const loginResponse = await authorize_citizen_login(citizenConnection, {
    body: {
      email,
      password: "securePassword123",
    } satisfies IEconomicBoardCitizen.ILogin,
  });
  typia.assert(loginResponse);
  // 3. Use a valid UUID for session ID (any valid UUID will do, since we're checking authorization, not session existence)
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to audit session as citizen - should be denied (403 Forbidden)
  await TestValidator.httpError(
    "citizen should be denied session audit access",
    403,
    async () => {
      await api.functional.economicBoard.citizen.sessions.at(
        citizenConnection,
        {
          sessionId,
        },
      );
    },
  );
}
