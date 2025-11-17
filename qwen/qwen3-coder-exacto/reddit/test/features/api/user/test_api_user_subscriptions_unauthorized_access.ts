import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunitySubscription";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunitySubscription";

/**
 * Test that users cannot access other users' subscription lists.
 *
 * This test validates that the API properly enforces authorization when
 * accessing user subscription endpoints. It creates two users, subscribes one
 * user to a community, and then attempts to access that user's subscriptions
 * using another user's credentials. The test ensures that such unauthorized
 * access is properly rejected.
 *
 * Test flow:
 *
 * 1. Create first user (will be the target whose subscriptions are accessed)
 * 2. Create second user (will attempt unauthorized access)
 * 3. Create a community for subscription
 * 4. Subscribe the first user to the community
 * 5. Attempt to access first user's subscriptions using second user's credentials
 * 6. Verify that the request is rejected with proper error
 */
export async function test_api_user_subscriptions_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Create first user
  const firstUserJoin = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.alphabets(8),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const firstUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: firstUserJoin,
    });
  typia.assert(firstUser);

  // Step 2: Create second user
  const secondUserJoin = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
    username: RandomGenerator.alphabets(8),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const secondUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: secondUserJoin,
    });
  typia.assert(secondUser);

  // Step 3: Create a community for subscription
  const communityCreate = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph(),
    rules: RandomGenerator.paragraph(),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 4: Subscribe first user to the community
  // Re-authenticate as first user
  await api.functional.auth.user.join(connection, {
    body: firstUserJoin,
  });

  const subscription: ICommunityForumCommunitySubscription =
    await api.functional.communityForum.user.communities.subscriptions.create(
      connection,
      {
        communitySlug: community.slug,
      },
    );
  typia.assert(subscription);

  // Step 5: Attempt to access first user's subscriptions using second user's credentials
  // Authenticate as second user
  await api.functional.auth.user.join(connection, {
    body: secondUserJoin,
  });

  // Step 6: Try to access first user's subscriptions with second user's credentials
  await TestValidator.error(
    "should reject unauthorized access to user subscriptions",
    async () => {
      await api.functional.communityForum.user.users.subscriptions.index(
        connection,
        {
          username: firstUser.username,
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityForumCommunitySubscription.IRequest,
        },
      );
    },
  );
}
