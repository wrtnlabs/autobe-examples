import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunitySubscription";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function test_api_member_subscriptions_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<50>
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 2: Create multiple moderators for community creation
  const moderatorCount = 5;
  const moderators = await ArrayUtil.asyncRepeat(
    moderatorCount,
    async (index) => {
      const modEmail = typia.random<string & tags.Format<"email">>();
      const modPassword = typia.random<string & tags.MinLength<8>>();

      const moderator = await api.functional.auth.moderator.join(connection, {
        body: {
          email: modEmail,
          password: modPassword,
          nickname: RandomGenerator.name(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      });
      typia.assert(moderator);
      return { moderator, email: modEmail, password: modPassword };
    },
  );

  // Step 3: Create diverse communities with varied characteristics
  const communities = await ArrayUtil.asyncRepeat(
    moderatorCount,
    async (index) => {
      const modData = moderators[index];

      // Switch to moderator context
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: modData.email,
          password: modData.password,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunityModerator.ILogin,
      });

      // Create community with specific naming pattern
      const isTechCommunity = index < 3;
      const communityName = isTechCommunity
        ? `tech${RandomGenerator.alphabets(5)}`
        : RandomGenerator.alphabets(8);

      const community =
        await api.functional.redditCommunity.moderator.communities.create(
          connection,
          {
            body: {
              name: communityName,
              display_title: isTechCommunity
                ? `Tech ${RandomGenerator.name(2)}`
                : RandomGenerator.name(2),
              description: RandomGenerator.paragraph({ sentences: 5 }),
              rules: RandomGenerator.paragraph({ sentences: 3 }),
            } satisfies IRedditCommunityCommunity.ICreate,
          },
        );
      typia.assert(community);
      return community;
    },
  );

  // Step 4: Switch back to member and subscribe to all communities
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  await ArrayUtil.asyncForEach(communities, async (community) => {
    const subscription =
      await api.functional.redditCommunity.member.communities.subscriptions.create(
        connection,
        {
          communityName: community.name,
        },
      );
    typia.assert(subscription);
  });

  // Step 5: Test combined filtering and sorting parameters
  const searchQuery = "tech";
  const pageLimit = 5;
  const sortBy = "subscriber_count" as const;
  const sortOrder = "desc" as const;

  const filteredResult =
    await api.functional.redditCommunity.member.members.subscriptions.index(
      connection,
      {
        username: memberUsername,
        body: {
          search: searchQuery,
          sort_by: sortBy,
          order: sortOrder,
          page: 1,
          limit: pageLimit,
        } satisfies IRedditCommunityCommunitySubscription.IRequest,
      },
    );
  typia.assert(filteredResult);

  // Step 6: Validate search filtering
  TestValidator.predicate(
    "all returned communities contain search term",
    filteredResult.data.every(
      (sub) =>
        sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.title.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );

  // Step 7: Validate pagination metadata
  TestValidator.predicate(
    "pagination limit matches request",
    filteredResult.pagination.limit === pageLimit,
  );

  TestValidator.predicate(
    "pagination current page is 1",
    filteredResult.pagination.current === 0,
  );

  TestValidator.predicate(
    "returned data respects limit",
    filteredResult.data.length <= pageLimit,
  );

  // Step 8: Validate sorting order (descending by subscriber_count)
  if (filteredResult.data.length > 1) {
    TestValidator.predicate(
      "results sorted by subscriber_count descending",
      filteredResult.data.every(
        (sub, idx, arr) =>
          idx === 0 || arr[idx - 1].subscriber_count >= sub.subscriber_count,
      ),
    );
  }

  // Step 9: Test without search to verify all subscriptions
  const allSubscriptions =
    await api.functional.redditCommunity.member.members.subscriptions.index(
      connection,
      {
        username: memberUsername,
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityCommunitySubscription.IRequest,
      },
    );
  typia.assert(allSubscriptions);

  TestValidator.predicate(
    "total subscriptions count matches created communities",
    allSubscriptions.pagination.records === communities.length,
  );

  // Step 10: Test different sorting combinations
  const sortedByName =
    await api.functional.redditCommunity.member.members.subscriptions.index(
      connection,
      {
        username: memberUsername,
        body: {
          sort_by: "community_name",
          order: "asc",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunitySubscription.IRequest,
      },
    );
  typia.assert(sortedByName);

  if (sortedByName.data.length > 1) {
    TestValidator.predicate(
      "results sorted by community_name ascending",
      sortedByName.data.every(
        (sub, idx, arr) =>
          idx === 0 || arr[idx - 1].name.localeCompare(sub.name) <= 0,
      ),
    );
  }
}
