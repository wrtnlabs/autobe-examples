import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunitySubscription";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

export async function test_api_user_subscriptions_privacy_control(
  connection: api.IConnection,
) {
  // Step 1: Create first member account with private subscription settings
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberPassword = typia.random<string & tags.MinLength<8>>();
  const firstMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: firstMemberEmail,
        password: firstMemberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(firstMember);

  // Store first member's token for later use
  const firstMemberToken = firstMember.token.access;

  // Step 2: Create community for subscription testing
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
        privacy_type: "public",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: First member subscribes to the community
  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.users.subscriptions.create(connection, {
      userId: firstMember.id,
      body: {
        community_id: community.id,
      } satisfies IRedditLikeUser.ISubscriptionCreate,
    });
  typia.assert(subscription);

  // Step 4: Create second member account to test privacy restrictions
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: secondMemberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(secondMember);

  // Step 5: Second member attempts to view first member's private subscriptions
  // This should be restricted based on privacy settings
  await TestValidator.error(
    "other user cannot view private subscriptions",
    async () => {
      await api.functional.redditLike.users.subscriptions.getByUserid(
        connection,
        {
          userId: firstMember.id,
        },
      );
    },
  );

  // Step 6: Switch back to first member by restoring their authentication token
  connection.headers = connection.headers || {};
  connection.headers.Authorization = firstMemberToken;

  const ownSubscriptions: IPageIRedditLikeCommunitySubscription.ISummary =
    await api.functional.redditLike.users.subscriptions.getByUserid(
      connection,
      {
        userId: firstMember.id,
      },
    );
  typia.assert(ownSubscriptions);

  // Step 7: Validate that own subscriptions are visible and contain the subscribed community
  TestValidator.predicate(
    "user can view own subscriptions",
    ownSubscriptions.data.length > 0,
  );

  const foundSubscription = ownSubscriptions.data.find(
    (sub) => sub.community.id === community.id,
  );
  TestValidator.predicate(
    "subscribed community appears in own subscription list",
    foundSubscription !== undefined,
  );
}
