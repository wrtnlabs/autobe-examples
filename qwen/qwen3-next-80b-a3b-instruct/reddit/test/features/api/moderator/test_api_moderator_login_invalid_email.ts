import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";

export async function test_api_moderator_login_invalid_email(
  connection: api.IConnection,
) {
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  // Create a valid moderator account
  await api.functional.auth.moderator.join(connection, {
    body: moderatorEmail satisfies IModerator.ICreate,
  });

  // Use a different, non-existent email for login test
  const invalidEmail = typia.random<string & tags.Format<"email">>();
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: invalidEmail,
          password: "validPassword123",
        } satisfies IModerator.IAuth,
      });
    },
  );
}
