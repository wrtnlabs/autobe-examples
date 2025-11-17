import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_login_email_not_found(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "login should fail with non-existent email",
    async () => {
      await api.functional.auth.citizen.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(12),
        } satisfies IEconomicBoardCitizen.ILogin,
      });
    },
  );
}
