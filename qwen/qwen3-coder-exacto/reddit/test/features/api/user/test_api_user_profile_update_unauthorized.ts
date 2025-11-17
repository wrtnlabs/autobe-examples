import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_user_profile_update_unauthorized(
  connection: api.IConnection,
) {
  // Create first user
  const user1Join = {
    email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
    password: "password123",
    username: `user1_${RandomGenerator.alphaNumeric(5)}`,
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user1: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user1Join,
    });
  typia.assert(user1);

  // Create second user
  const user2Join = {
    email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
    password: "password123",
    username: `user2_${RandomGenerator.alphaNumeric(5)}`,
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user2: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user2Join,
    });
  typia.assert(user2);

  // Try to update user2's profile while authenticated as user1
  // This should fail with a 403 Forbidden error
  await TestValidator.httpError(
    "cannot update another user's profile",
    403,
    async () => {
      await api.functional.communityForum.user.users.update(connection, {
        username: user2.username,
        body: {
          username: `hacked_${RandomGenerator.alphaNumeric(5)}`,
        } satisfies ICommunityForumCommunityUser.IUpdate,
      });
    },
  );
}
