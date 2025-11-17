import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";

export async function test_api_moderator_registration_long_password(
  connection: api.IConnection,
) {
  // Generate a password exceeding 72 characters
  const longPassword = RandomGenerator.alphabets(73);

  // Verify password length is exactly 73 characters
  TestValidator.equals("password length should be 73", longPassword.length, 73);

  // Attempt to register moderator with long password - should fail
  await TestValidator.error(
    "should reject password exceeding 72 characters",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: longPassword,
        } satisfies IEconomicBoardModerator.ICreate,
      });
    },
  );
}
