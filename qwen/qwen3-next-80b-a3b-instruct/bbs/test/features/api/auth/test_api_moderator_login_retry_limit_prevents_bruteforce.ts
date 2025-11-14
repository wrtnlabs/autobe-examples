import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_retry_limit_prevents_bruteforce(
  connection: api.IConnection,
) {
  // Generate 6 invalid login strings (as required by ILogin type)
  const invalidCredentials = ArrayUtil.repeat(6, (index) => {
    return `invalid_${typia.random<string & tags.Format<"email">>()}`;
  });

  // Execute the 5 initial failed login attempts (should fail with 401 Unauthorized)
  for (let i = 0; i < 5; i++) {
    await TestValidator.error(
      `failed login attempt ${i + 1} should return 401 Unauthorized`,
      async () => {
        await api.functional.auth.moderator.login(connection, {
          body: invalidCredentials[i],
        });
      },
    );
  }

  // The 6th attempt should trigger the retry limit and return 429 Too Many Requests
  await TestValidator.error(
    "6th login attempt should return 429 Too Many Requests",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: invalidCredentials[5],
      });
    },
  );

  // Verify that a subsequent attempt still fails with 429 during the lockout period
  await TestValidator.error(
    "7th login attempt should still return 429 Too Many Requests during lockout period",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: `invalid_${typia.random<string & tags.Format<"email">>()}`,
      });
    },
  );
}
