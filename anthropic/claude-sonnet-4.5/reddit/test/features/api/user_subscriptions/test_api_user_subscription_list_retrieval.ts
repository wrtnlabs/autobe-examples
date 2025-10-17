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
 * Test retrieving a user's subscribed communities with pagination.
 *
 * This test validates the complete subscription retrieval workflow including:
 *
 * 1. Member account creation and authentication
 * 2. Multiple community creation with diverse attributes
 * 3. Building subscription relationships
 * 4. Retrieving subscription list with pagination
 * 5. Validating complete community details in response
 */
export async function test_api_user_subscription_list_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";

  const memberBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: memberEmail,
    password: memberPassword,
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberBody });
  typia.assert(member);

  // Step 2: Create multiple communities with different categories and privacy types
  const categories = [
    "Technology",
    "Gaming",
    "Sports",
    "Music",
    "Science",
  ] as const;
  const privacyTypes = ["public", "private"] as const;

  const communities: IRedditLikeCommunity[] = await ArrayUtil.asyncRepeat(
    6,
    async (index) => {
      const category = RandomGenerator.pick(categories);
      const privacyType = RandomGenerator.pick(privacyTypes);

      const communityBody = {
        code: `community_${RandomGenerator.alphaNumeric(8)}`,
        name: `${category} Community ${index + 1}`,
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        icon_url: `https://example.com/icons/${RandomGenerator.alphaNumeric(8)}.png`,
        banner_url: `https://example.com/banners/${RandomGenerator.alphaNumeric(8)}.jpg`,
        privacy_type: privacyType,
        posting_permission: RandomGenerator.pick([
          "anyone_subscribed",
          "approved_only",
          "moderators_only",
        ] as const),
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: category,
        secondary_tags: ArrayUtil.repeat(2, () => RandomGenerator.name(1)).join(
          ",",
        ),
      } satisfies IRedditLikeCommunity.ICreate;

      const community =
        await api.functional.redditLike.member.communities.create(connection, {
          body: communityBody,
        });
      typia.assert(community);
      return community;
    },
  );

  // Step 3: Subscribe member to all created communities
  const subscriptions: IRedditLikeCommunitySubscription[] =
    await ArrayUtil.asyncMap(communities, async (community) => {
      const subscription =
        await api.functional.redditLike.member.communities.subscribe.create(
          connection,
          { communityId: community.id },
        );
      typia.assert(subscription);
      return subscription;
    });

  // Step 4: Retrieve subscription list with pagination
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies IRedditLikeUser.ISubscriptionsRequest;

  const subscriptionPage: IPageIRedditLikeCommunity.ISubscriptionSummary =
    await api.functional.redditLike.users.subscriptions.patchByUserid(
      connection,
      {
        userId: member.id,
        body: requestBody,
      },
    );
  typia.assert(subscriptionPage);

  // Step 5: Validate pagination structure
  TestValidator.equals(
    "current page should be 1",
    subscriptionPage.pagination.current,
    1,
  );

  TestValidator.equals(
    "limit should match request",
    subscriptionPage.pagination.limit,
    10,
  );

  TestValidator.equals(
    "total records should match subscription count",
    subscriptionPage.pagination.records,
    communities.length,
  );

  // Step 6: Validate subscription data completeness
  TestValidator.equals(
    "data array length should match subscription count",
    subscriptionPage.data.length,
    communities.length,
  );

  // Step 7: Verify subscription summaries are valid (typia.assert already validated all properties)
  subscriptionPage.data.forEach((subscriptionSummary) => {
    typia.assert(subscriptionSummary);
  });

  // Step 8: Test pagination with smaller limit
  const paginatedRequest = {
    page: 1,
    limit: 3,
  } satisfies IRedditLikeUser.ISubscriptionsRequest;

  const paginatedPage =
    await api.functional.redditLike.users.subscriptions.patchByUserid(
      connection,
      {
        userId: member.id,
        body: paginatedRequest,
      },
    );
  typia.assert(paginatedPage);

  TestValidator.equals(
    "paginated limit should be 3",
    paginatedPage.pagination.limit,
    3,
  );

  TestValidator.predicate(
    "paginated data length should not exceed limit",
    paginatedPage.data.length <= 3,
  );
}
