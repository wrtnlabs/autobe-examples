import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_moderator_login_nonexistent_user(
  connection: api.IConnection,
) {
  // Test that logging in with a non-existent moderator email returns an appropriate error
  const loginBody = {
    email: "nonexistent@example.com",
    password: "password123",
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000",
  } satisfies ICommunityForumCommunityModerator.ILogin;

  // Attempt to login with non-existent user credentials
  await TestValidator.error(
    "should reject login for non-existent moderator",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: loginBody,
      });
    },
  );
}
