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
 * Test user subscription list retrieval with pagination.
 *
 * This test validates the subscription list API's ability to retrieve a user's
 * subscribed communities with proper pagination support. The test creates
 * multiple communities, subscribes to them, and validates that the subscription
 * list API correctly returns subscription data with complete metadata.
 *
 * Test workflow:
 *
 * 1. Create a member account for subscription testing
 * 2. Create multiple communities with diverse attributes
 * 3. Subscribe to all communities
 * 4. Retrieve subscription list and validate complete data
 * 5. Test pagination with different page sizes
 * 6. Validate subscription metadata completeness
 * 7. Ensure no duplicate entries across paginated results
 */
export async function test_api_user_subscription_list_search_and_filter(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create diverse communities
  const categories = [
    "Technology",
    "Gaming",
    "Education",
    "Sports",
    "Entertainment",
  ] as const;
  const privacyTypes = ["public", "private"] as const;

  const communities: IRedditLikeCommunity[] = await ArrayUtil.asyncRepeat(
    10,
    async (index) => {
      const category = RandomGenerator.pick(categories);
      const privacyType = RandomGenerator.pick(privacyTypes);

      const community: IRedditLikeCommunity =
        await api.functional.redditLike.member.communities.create(connection, {
          body: {
            code: `community_${RandomGenerator.alphaNumeric(8)}`,
            name: `${category} Community ${index + 1}`,
            description: `A ${privacyType} community focused on ${category} topics and discussions`,
            privacy_type: privacyType,
            primary_category: category,
            allow_text_posts: true,
            allow_link_posts: true,
            allow_image_posts: true,
          } satisfies IRedditLikeCommunity.ICreate,
        });
      typia.assert(community);

      return community;
    },
  );

  // Step 3: Subscribe to all communities
  const subscriptions: IRedditLikeCommunitySubscription[] =
    await ArrayUtil.asyncRepeat(communities.length, async (index) => {
      const subscription: IRedditLikeCommunitySubscription =
        await api.functional.redditLike.member.communities.subscribe.create(
          connection,
          {
            communityId: communities[index].id,
          },
        );
      typia.assert(subscription);

      return subscription;
    });

  // Step 4: Retrieve all subscriptions
  const allSubscriptions: IPageIRedditLikeCommunity.ISubscriptionSummary =
    await api.functional.redditLike.users.subscriptions.patchByUserid(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditLikeUser.ISubscriptionsRequest,
      },
    );
  typia.assert(allSubscriptions);

  // Validate all subscriptions are present
  TestValidator.equals(
    "total subscription count matches",
    allSubscriptions.pagination.records,
    communities.length,
  );

  // Validate subscription data exists
  TestValidator.predicate(
    "subscription list contains data",
    allSubscriptions.data.length > 0,
  );

  // Step 5: Validate each subscription has complete community metadata
  for (const sub of allSubscriptions.data) {
    TestValidator.predicate(
      "subscription has community ID",
      sub.id !== undefined && sub.id !== null,
    );
    TestValidator.predicate(
      "subscription has community code",
      sub.code !== undefined && sub.code !== null,
    );
    TestValidator.predicate(
      "subscription has community name",
      sub.name !== undefined && sub.name !== null,
    );
    TestValidator.predicate(
      "subscription has subscriber count",
      sub.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "subscription has subscribed_at timestamp",
      sub.subscribed_at !== undefined && sub.subscribed_at !== null,
    );
  }

  // Step 6: Test pagination with smaller page size
  const paginatedResult: IPageIRedditLikeCommunity.ISubscriptionSummary =
    await api.functional.redditLike.users.subscriptions.patchByUserid(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IRedditLikeUser.ISubscriptionsRequest,
      },
    );
  typia.assert(paginatedResult);

  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.data.length,
    5,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedResult.pagination.limit, 5);
  TestValidator.predicate(
    "pagination total pages calculated",
    paginatedResult.pagination.pages >= 2,
  );

  // Step 7: Test second page
  const secondPage: IPageIRedditLikeCommunity.ISubscriptionSummary =
    await api.functional.redditLike.users.subscriptions.patchByUserid(
      connection,
      {
        userId: member.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IRedditLikeUser.ISubscriptionsRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals("second page number", secondPage.pagination.current, 2);
  TestValidator.predicate("second page has data", secondPage.data.length > 0);

  // Validate no duplicate data between pages
  const firstPageIds = paginatedResult.data.map((s) => s.id);
  const secondPageIds = secondPage.data.map((s) => s.id);
  const hasNoDuplicates = firstPageIds.every(
    (id) => secondPageIds.includes(id) === false,
  );
  TestValidator.predicate(
    "no duplicate subscriptions between pages",
    hasNoDuplicates,
  );

  // Step 8: Verify subscription metadata matches created communities
  const subscriptionIds = allSubscriptions.data.map((s) => s.id);
  const communityIds = communities.map((c) => c.id);

  for (const communityId of communityIds) {
    TestValidator.predicate(
      "community appears in subscription list",
      subscriptionIds.includes(communityId),
    );
  }
}
