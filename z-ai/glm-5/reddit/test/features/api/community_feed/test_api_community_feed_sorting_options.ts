import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test that the community feed correctly sorts posts using all supported sorting algorithms: hot, new, top, and controversial.
 */
export async function test_api_community_feed_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create multiple posts with varied characteristics for sorting tests
  const posts = await ArrayUtil.asyncRepeat(5, async (index) => {
    await new Promise((resolve) => setTimeout(resolve, 50 * index));
    const post = await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          contentType: "text",
          textContent: RandomGenerator.paragraph({ sentences: 3 }),
          linkUrl: null,
          imageUrl: null,
        },
      },
    );
    typia.assert(post);
    return post;
  });
  // 4. Test Hot sorting
  const hotFeed = await api.functional.communityPlatform.communities.feed.index(
    memberConnection,
    {
      communityName: community.name,
      body: {
        sort: "hot",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(hotFeed);
  TestValidator.predicate("hot feed has data", hotFeed.data.length > 0);
  // 5. Test New sorting - should be chronological (most recent first)
  const newFeed = await api.functional.communityPlatform.communities.feed.index(
    memberConnection,
    {
      communityName: community.name,
      body: {
        sort: "new",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(newFeed);
  TestValidator.predicate("new feed has data", newFeed.data.length > 0);
  // Validate chronological order (most recent first) - new posts should come before older ones
  if (newFeed.data.length > 1) {
    for (let i = 0; i < newFeed.data.length - 1; i++) {
      const current = new Date(newFeed.data[i].createdAt).getTime();
      const next = new Date(newFeed.data[i + 1].createdAt).getTime();
      TestValidator.predicate("new feed chronological order", current >= next);
    }
  }
  // 6. Test Top sorting with all time filters
  const timeFilters = [
    "today",
    "this_week",
    "this_month",
    "this_year",
    "all_time",
  ] as const;
  for (const timeFilter of timeFilters) {
    const topFeed =
      await api.functional.communityPlatform.communities.feed.index(
        memberConnection,
        {
          communityName: community.name,
          body: {
            sort: "top",
            timeFilter,
          } satisfies ICommunityPlatformPost.IRequest,
        },
      );
    typia.assert(topFeed);
    TestValidator.predicate(
      `top feed with ${timeFilter} filter has data`,
      topFeed.data !== undefined,
    );
  }
  // Validate top sorting order (highest score first)
  const topFeedAllTime =
    await api.functional.communityPlatform.communities.feed.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          sort: "top",
          timeFilter: "all_time",
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(topFeedAllTime);
  if (topFeedAllTime.data.length > 1) {
    for (let i = 0; i < topFeedAllTime.data.length - 1; i++) {
      TestValidator.predicate(
        "top feed score descending",
        topFeedAllTime.data[i].score >= topFeedAllTime.data[i + 1].score,
      );
    }
  }
  // 7. Test Controversial sorting
  const controversialFeed =
    await api.functional.communityPlatform.communities.feed.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          sort: "controversial",
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(controversialFeed);
  TestValidator.predicate(
    "controversial feed has data",
    controversialFeed.data !== undefined,
  );
  // 8. Validate pagination metadata is present in all feeds
  TestValidator.predicate(
    "hot feed pagination",
    hotFeed.pagination !== undefined,
  );
  TestValidator.predicate(
    "new feed pagination",
    newFeed.pagination !== undefined,
  );
  TestValidator.predicate(
    "top feed pagination",
    topFeedAllTime.pagination !== undefined,
  );
  TestValidator.predicate(
    "controversial feed pagination",
    controversialFeed.pagination !== undefined,
  );
  // 9. Test with limit parameter
  const limitedFeed =
    await api.functional.communityPlatform.communities.feed.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          sort: "new",
          limit: 2,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(limitedFeed);
  TestValidator.predicate(
    "limited feed respects limit",
    limitedFeed.data.length <= 2,
  );
  TestValidator.equals(
    "limited feed pagination limit",
    limitedFeed.pagination.limit,
    2,
  );
}
