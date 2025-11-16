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

/**
 * Test various sorting options for member subscriptions.
 *
 * This test validates that member subscriptions can be sorted by:
 *
 * - Subscription_date (most recent first and oldest first)
 * - Community_name (alphabetically A-Z and Z-A)
 * - Subscriber_count (most popular first and least popular first)
 *
 * The test creates multiple communities with varying characteristics,
 * subscribes a member to them in a specific sequence, and validates that the
 * sorting options return correctly ordered results.
 */
export async function test_api_member_subscriptions_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with stored password
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account with stored password
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 3: Switch to moderator to create communities
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator.email,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 4: Create multiple communities with varied names for testing
  const communityNames = [
    "alpha_community",
    "zulu_community",
    "beta_community",
    "delta_community",
  ];
  const communities: IRedditCommunityCommunity[] = [];

  for (const name of communityNames) {
    const community =
      await api.functional.redditCommunity.moderator.communities.create(
        connection,
        {
          body: {
            name: name,
            display_title: RandomGenerator.name(2),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            rules: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IRedditCommunityCommunity.ICreate,
        },
      );
    typia.assert(community);
    communities.push(community);
  }

  // Step 5: Switch to member account
  await api.functional.auth.member.login(connection, {
    body: {
      email: member.email,
      password: memberPassword,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  // Step 6: Subscribe to communities in a specific order (to test subscription_date sorting)
  const subscriptionOrder: IRedditCommunityCommunitySubscription[] = [];
  for (const community of communities) {
    const subscription =
      await api.functional.redditCommunity.member.communities.subscriptions.create(
        connection,
        {
          communityName: community.name,
        },
      );
    typia.assert(subscription);
    subscriptionOrder.push(subscription);
  }

  // Step 7: Test sorting by subscription_date descending (most recent first)
  const byDateDesc =
    await api.functional.redditCommunity.member.members.subscriptions.index(
      connection,
      {
        username: member.username,
        body: {
          sort_by: "subscription_date",
          order: "desc",
        } satisfies IRedditCommunityCommunitySubscription.IRequest,
      },
    );
  typia.assert(byDateDesc);

  // Validate descending order - most recent subscriptions first
  for (let i = 0; i < byDateDesc.data.length - 1; i++) {
    const current = new Date(byDateDesc.data[i].created_at).getTime();
    const next = new Date(byDateDesc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "subscription_date desc: current subscription is newer or equal to next",
      current >= next,
    );
  }

  // Step 8: Test sorting by subscription_date ascending (oldest first)
  const byDateAsc =
    await api.functional.redditCommunity.member.members.subscriptions.index(
      connection,
      {
        username: member.username,
        body: {
          sort_by: "subscription_date",
          order: "asc",
        } satisfies IRedditCommunityCommunitySubscription.IRequest,
      },
    );
  typia.assert(byDateAsc);

  // Validate ascending order - oldest subscriptions first
  for (let i = 0; i < byDateAsc.data.length - 1; i++) {
    const current = new Date(byDateAsc.data[i].created_at).getTime();
    const next = new Date(byDateAsc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "subscription_date asc: current subscription is older or equal to next",
      current <= next,
    );
  }

  // Step 9: Test sorting by community_name ascending (A-Z)
  const byNameAsc =
    await api.functional.redditCommunity.member.members.subscriptions.index(
      connection,
      {
        username: member.username,
        body: {
          sort_by: "community_name",
          order: "asc",
        } satisfies IRedditCommunityCommunitySubscription.IRequest,
      },
    );
  typia.assert(byNameAsc);

  // Validate alphabetical ascending order
  for (let i = 0; i < byNameAsc.data.length - 1; i++) {
    TestValidator.predicate(
      "community_name asc: current name is alphabetically before or equal to next",
      byNameAsc.data[i].name <= byNameAsc.data[i + 1].name,
    );
  }

  // Step 10: Test sorting by community_name descending (Z-A)
  const byNameDesc =
    await api.functional.redditCommunity.member.members.subscriptions.index(
      connection,
      {
        username: member.username,
        body: {
          sort_by: "community_name",
          order: "desc",
        } satisfies IRedditCommunityCommunitySubscription.IRequest,
      },
    );
  typia.assert(byNameDesc);

  // Validate alphabetical descending order
  for (let i = 0; i < byNameDesc.data.length - 1; i++) {
    TestValidator.predicate(
      "community_name desc: current name is alphabetically after or equal to next",
      byNameDesc.data[i].name >= byNameDesc.data[i + 1].name,
    );
  }

  // Step 11: Test sorting by subscriber_count descending (most popular first)
  const bySubscriberDesc =
    await api.functional.redditCommunity.member.members.subscriptions.index(
      connection,
      {
        username: member.username,
        body: {
          sort_by: "subscriber_count",
          order: "desc",
        } satisfies IRedditCommunityCommunitySubscription.IRequest,
      },
    );
  typia.assert(bySubscriberDesc);

  // Validate subscriber count descending order
  for (let i = 0; i < bySubscriberDesc.data.length - 1; i++) {
    TestValidator.predicate(
      "subscriber_count desc: current count is greater or equal to next",
      bySubscriberDesc.data[i].subscriber_count >=
        bySubscriberDesc.data[i + 1].subscriber_count,
    );
  }

  // Step 12: Test sorting by subscriber_count ascending (least popular first)
  const bySubscriberAsc =
    await api.functional.redditCommunity.member.members.subscriptions.index(
      connection,
      {
        username: member.username,
        body: {
          sort_by: "subscriber_count",
          order: "asc",
        } satisfies IRedditCommunityCommunitySubscription.IRequest,
      },
    );
  typia.assert(bySubscriberAsc);

  // Validate subscriber count ascending order
  for (let i = 0; i < bySubscriberAsc.data.length - 1; i++) {
    TestValidator.predicate(
      "subscriber_count asc: current count is less or equal to next",
      bySubscriberAsc.data[i].subscriber_count <=
        bySubscriberAsc.data[i + 1].subscriber_count,
    );
  }
}
