import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunitySubscription";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_community_subscription_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const userJoin: ICommunityForumCommunityUser.IJoin = {
    email: "test@example.com",
    password: "password123",
    username: "testuser",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const authorizedUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(authorizedUser);

  // Step 2: Attempt to subscribe to a non-existent community
  await TestValidator.error(
    "should fail when subscribing to non-existent community",
    async () => {
      await api.functional.communityForum.user.communities.subscriptions.create(
        connection,
        {
          communitySlug: "non-existent-community",
        },
      );
    },
  );
}
