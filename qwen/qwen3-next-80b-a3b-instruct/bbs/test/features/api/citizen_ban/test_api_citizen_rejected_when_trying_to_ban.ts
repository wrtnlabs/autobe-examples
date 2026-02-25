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
import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_citizen_rejected_when_trying_to_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds: IEconomicBoardAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const adminUser = await authorize_administrator_join(adminConnection, {
    body: adminCreds,
  });
  typia.assert(adminUser);
  // 2. Create citizen account
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenCreds: IEconomicBoardCitizen.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  };
  const citizenUser = await authorize_citizen_join(citizenConnection, {
    body: citizenCreds,
  });
  typia.assert(citizenUser);
  // 3. Authenticate as citizen
  const citizenLoginConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_login(citizenLoginConnection, {
    body: {
      email: citizenCreds.email,
      password: citizenCreds.password,
    } satisfies IEconomicBoardCitizen.ILogin,
  });
  // 4. Citizen attempts to ban administrator user (should fail with 403 Forbidden)
  await TestValidator.httpError(
    "citizen banned attempt rejected with 403",
    403,
    async () => {
      await api.functional.economicBoard.administrator.users.ban(
        citizenLoginConnection,
        {
          userId: adminUser.id,
          body: {
            id: adminUser.id,
            email: adminUser.email,
            display_name: adminUser.display_name,
            bio: adminUser.bio,
            is_banned: true,
            ban_reason: "Unauthorized ban attempt",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            article_count: 0,
            comment_count: 0,
          } satisfies IEconomicBoardCitizen,
        },
      );
    },
  );
}
