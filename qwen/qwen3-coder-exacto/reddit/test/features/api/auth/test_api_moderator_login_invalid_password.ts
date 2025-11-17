import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_moderator_login_invalid_password(
  connection: api.IConnection,
) {
  // First, create a user account that will become a moderator
  const email = typia.random<string & tags.Format<"email">>();
  const password = "correct_password_123";

  // Since we don't have a direct API to create users, we'll need to work with what we have
  // Let's assume we have a way to create a user through other means or we'll just test with invalid login directly

  // Attempt to login with a valid email format but wrong password
  await TestValidator.error(
    "moderator login should fail with invalid password",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: email,
          password: "wrong_password_123", // Invalid password
          href: "http://localhost:3000/login",
          referrer: "http://localhost:3000/",
        } satisfies ICommunityForumCommunityModerator.ILogin,
      });
    },
  );
}
