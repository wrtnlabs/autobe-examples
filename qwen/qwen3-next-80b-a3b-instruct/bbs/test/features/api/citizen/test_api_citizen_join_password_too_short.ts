import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_join_password_too_short(
  connection: api.IConnection,
) {
  const badPassword = "short"; // Below minimum 8 characters

  await TestValidator.error(
    "password too short should fail registration",
    async () => {
      await api.functional.auth.citizen.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: badPassword,
          href: "https://example.com/join",
          referrer: "https://example.com",
        } satisfies IEconomicBoardCitizen.ICreate,
      });
    },
  );
}
