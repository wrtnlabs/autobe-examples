import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_user_login_invalid_password(
  connection: api.IConnection,
) {
  // First, create a user account that we'll attempt to log into with wrong password
  const email = typia.random<string & tags.Format<"email">>();
  const correctPassword = "CorrectPassword123!";
  const username = RandomGenerator.name(1)
    .replace(/\s+/g, "_")
    .substring(0, 20);

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password: correctPassword,
        username,
      } satisfies ICommunityForumCommunityUser.IJoin,
    });
  typia.assert(user);

  // Now attempt to log in with the same email but incorrect password
  const wrongPassword = "WrongPassword456@";
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email,
          password: wrongPassword,
          href: "http://localhost:3000/login",
          referrer: "http://localhost:3000/",
        } satisfies ICommunityForumCommunityUser.ILogin,
      });
    },
  );
}
