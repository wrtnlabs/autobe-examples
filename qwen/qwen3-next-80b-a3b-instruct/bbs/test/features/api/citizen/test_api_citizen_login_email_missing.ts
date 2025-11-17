import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_login_email_missing(
  connection: api.IConnection,
) {
  await TestValidator.error("login with empty email should fail", async () => {
    await api.functional.auth.citizen.login(connection, {
      body: {
        email: "",
        password: RandomGenerator.alphaNumeric(10),
      } satisfies IEconomicBoardCitizen.ILogin,
    });
  });
}
