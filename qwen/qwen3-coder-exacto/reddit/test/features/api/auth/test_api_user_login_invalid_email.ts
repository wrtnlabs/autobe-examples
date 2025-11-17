import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_user_login_invalid_email(
  connection: api.IConnection,
) {
  // Generate a random email that doesn't exist in the system
  const invalidEmail = typia.random<string & tags.Format<"email">>();

  // Attempt to login with the invalid email
  await TestValidator.error(
    "login should fail with non-existent email",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: invalidEmail,
          password: "password123",
          href: "http://localhost:3000/login",
          referrer: "http://localhost:3000/",
        } satisfies ICommunityForumCommunityUser.ILogin,
      });
    },
  );
}
