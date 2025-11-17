import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_user_registration_duplicate_email(
  connection: api.IConnection,
) {
  // First, create a user with a specific email
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password123!";
  const username = RandomGenerator.name(1)
    .replace(/[^a-zA-Z0-9_]/g, "")
    .substring(0, 20);

  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      username,
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(firstUser);

  // Now try to create another user with the same email but different username
  const secondUsername = RandomGenerator.name(1)
    .replace(/[^a-zA-Z0-9_]/g, "")
    .substring(0, 20);

  await TestValidator.error(
    "should fail when trying to register with duplicate email",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email, // Same email as first user
          password,
          username: secondUsername,
        } satisfies ICommunityForumCommunityUser.IJoin,
      });
    },
  );
}
