import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";

export async function test_api_moderator_login_empty_email(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for test
  const joinResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: typia.random<IModerator.ICreate>(),
    });
  typia.assert(joinResponse);

  // Step 2: Attempt login with empty email and valid password
  await TestValidator.error("login with empty email should fail", async () => {
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: "", // empty email
        password: "validPassword123", // valid password
      } satisfies IModerator.IAuth,
    });
  });
}
