import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test user subscription list retrieval and verification.
 *
 * This test validates subscription list functionality:
 *
 * 1. Create member accounts for subscription testing
 * 2. Create multiple communities
 * 3. Subscribe to communities
 * 4. Retrieve and verify subscription lists
 * 5. Test pagination of subscription data
 * 6. Verify subscription data accuracy and completeness
 */
export async function test_api_user_subscription_list_privacy_controls(
  connection: api.IConnection,
) {
  // Step 1: Create profile owner member account
  const profileOwnerEmail = typia.random<string & tags.Format<"email">>();
  const profileOwner: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: profileOwnerEmail,
        password: "SecurePass123!",
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(profileOwner);

  // Step 2: Create viewer member account
  const viewerEmail = typia.random<string & tags.Format<"email">>();
  const viewer: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: viewerEmail,
        password: "SecurePass123!",
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(viewer);

  // Step 3: Switch to profile owner account and create communities
  connection.headers = { Authorization: profileOwner.token.access };

  const communities: IRedditLikeCommunity[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const community: IRedditLikeCommunity =
        await api.functional.redditLike.member.communities.create(connection, {
          body: {
            code: `community_${RandomGenerator.alphaNumeric(8)}`,
            name: RandomGenerator.name(2),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            privacy_type: "public",
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
          } satisfies IRedditLikeCommunity.ICreate,
        });
      typia.assert(community);
      return community;
    },
  );

  // Step 4: Profile owner subscribes to all created communities
  const subscriptions: IRedditLikeCommunitySubscription[] =
    await ArrayUtil.asyncMap(communities, async (community) => {
      const subscription: IRedditLikeCommunitySubscription =
        await api.functional.redditLike.member.communities.subscribe.create(
          connection,
          {
            communityId: community.id,
          },
        );
      typia.assert(subscription);
      return subscription;
    });

  TestValidator.equals(
    "subscription count matches community count",
    subscriptions.length,
    communities.length,
  );

  // Step 5: Retrieve profile owner's subscription list as themselves
  const ownerSubscriptionList: IPageIRedditLikeCommunity.ISubscriptionSummary =
    await api.functional.redditLike.users.subscriptions.patchByUserid(
      connection,
      {
        userId: profileOwner.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditLikeUser.ISubscriptionsRequest,
      },
    );
  typia.assert(ownerSubscriptionList);

  TestValidator.equals(
    "owner sees all subscribed communities",
    ownerSubscriptionList.data.length,
    communities.length,
  );

  TestValidator.predicate(
    "all subscribed communities are in the list",
    communities.every((community) =>
      ownerSubscriptionList.data.some((sub) => sub.id === community.id),
    ),
  );

  // Step 6: Switch to viewer account and retrieve subscription list
  connection.headers = { Authorization: viewer.token.access };

  const viewerAccessList: IPageIRedditLikeCommunity.ISubscriptionSummary =
    await api.functional.redditLike.users.subscriptions.patchByUserid(
      connection,
      {
        userId: profileOwner.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditLikeUser.ISubscriptionsRequest,
      },
    );
  typia.assert(viewerAccessList);

  TestValidator.equals(
    "viewer can retrieve subscription list",
    viewerAccessList.data.length,
    communities.length,
  );

  // Step 7: Test pagination with smaller limit
  const paginatedList: IPageIRedditLikeCommunity.ISubscriptionSummary =
    await api.functional.redditLike.users.subscriptions.patchByUserid(
      connection,
      {
        userId: profileOwner.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IRedditLikeUser.ISubscriptionsRequest,
      },
    );
  typia.assert(paginatedList);

  TestValidator.predicate(
    "pagination respects limit parameter",
    paginatedList.data.length <= 2,
  );

  TestValidator.equals(
    "pagination metadata shows total records",
    paginatedList.pagination.records,
    communities.length,
  );

  // Step 8: Verify subscription data completeness
  const firstSubscription = ownerSubscriptionList.data[0];
  typia.assert(firstSubscription);

  const matchingCommunity = communities.find(
    (c) => c.id === firstSubscription.id,
  );
  typia.assertGuard(matchingCommunity!);

  TestValidator.equals(
    "subscription summary contains community code",
    firstSubscription.code,
    matchingCommunity.code,
  );

  TestValidator.equals(
    "subscription summary contains community name",
    firstSubscription.name,
    matchingCommunity.name,
  );

  TestValidator.predicate(
    "subscription includes timestamp",
    firstSubscription.subscribed_at !== null &&
      firstSubscription.subscribed_at !== undefined,
  );
}
