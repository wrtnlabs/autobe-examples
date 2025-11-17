import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_join_email_invalid_format(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "invalid email format should reject registration",
    async () => {
      await api.functional.auth.citizen.join(connection, {
        body: {
          email: "invalid-email",
          password: "SecurePass123!",
          href: "https://example.com/join",
          referrer: "https://example.com/home",
        } satisfies IEconomicBoardCitizen.ICreate,
      });
    },
  );
}
