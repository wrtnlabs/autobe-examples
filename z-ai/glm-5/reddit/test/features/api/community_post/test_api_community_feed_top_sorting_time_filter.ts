import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test community feed Top sorting with time filter functionality.
 *
 * Tests the PATCH /community/communities/{communityName}/posts endpoint
 * with sort='top' and various time filter values to verify:
 * - Posts are ordered by vote_score descending
 * - Time filter parameter is accepted
 * - Pagination works correctly
 * - Default time filter behavior
 */
export async function test_api_community_feed_top_sorting_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // =========================================
  // Setup: Create member and community
  // =========================================
  // Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // =========================================
  // Create multiple posts in the community
  // =========================================
  // Create several posts - each gets automatic author upvote (vote_score=1)
  const postCount = 5;
  await ArrayUtil.asyncRepeat(postCount, async (index) => {
    const post =
      await generate_random_community_member_communities_posts_create(
        memberConnection,
        {
          params: { communityName: community.name },
          body: {
            title: `Test Post ${index + 1} - ${RandomGenerator.name()}`,
            post_type: "TEXT",
            text_content: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      );
    typia.assert(post);
  });
  // =========================================
  // Test Case 1: Top sorting with time='today'
  // =========================================
  const todayResult = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityName: community.name,
      body: {
        sort: "top",
        time: "today",
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(todayResult);
  // Verify pagination structure
  TestValidator.predicate(
    "today pagination current is valid",
    todayResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "today pagination limit is valid",
    todayResult.pagination.limit >= 10,
  );
  // Verify descending order by vote_score if there are results
  for (let i = 0; i < todayResult.data.length - 1; i++) {
    TestValidator.predicate(
      `today ordering: post ${i} has higher or equal score than post ${i + 1}`,
      todayResult.data[i].vote_score >= todayResult.data[i + 1].vote_score,
    );
  }
  // =========================================
  // Test Case 2: Top sorting with time='week'
  // =========================================
  const weekResult = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityName: community.name,
      body: {
        sort: "top",
        time: "week",
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(weekResult);
  // Verify descending order by vote_score
  for (let i = 0; i < weekResult.data.length - 1; i++) {
    TestValidator.predicate(
      `week ordering: post ${i} has higher or equal score than post ${i + 1}`,
      weekResult.data[i].vote_score >= weekResult.data[i + 1].vote_score,
    );
  }
  // =========================================
  // Test Case 3: Top sorting with time='month'
  // =========================================
  const monthResult = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityName: community.name,
      body: {
        sort: "top",
        time: "month",
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(monthResult);
  // Verify descending order by vote_score
  for (let i = 0; i < monthResult.data.length - 1; i++) {
    TestValidator.predicate(
      `month ordering: post ${i} has higher or equal score than post ${i + 1}`,
      monthResult.data[i].vote_score >= monthResult.data[i + 1].vote_score,
    );
  }
  // =========================================
  // Test Case 4: Top sorting with time='year'
  // =========================================
  const yearResult = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityName: community.name,
      body: {
        sort: "top",
        time: "year",
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(yearResult);
  // Verify descending order by vote_score
  for (let i = 0; i < yearResult.data.length - 1; i++) {
    TestValidator.predicate(
      `year ordering: post ${i} has higher or equal score than post ${i + 1}`,
      yearResult.data[i].vote_score >= yearResult.data[i + 1].vote_score,
    );
  }
  // =========================================
  // Test Case 5: Top sorting with time='all'
  // =========================================
  const allResult = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityName: community.name,
      body: {
        sort: "top",
        time: "all",
        limit: 100,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(allResult);
  // Should return all posts we created
  TestValidator.predicate(
    "all time filter returns at least our created posts",
    allResult.data.length >= postCount,
  );
  // Verify descending order by vote_score
  for (let i = 0; i < allResult.data.length - 1; i++) {
    TestValidator.predicate(
      `all ordering: post ${i} has higher or equal score than post ${i + 1}`,
      allResult.data[i].vote_score >= allResult.data[i + 1].vote_score,
    );
  }
  // Verify pagination metadata
  TestValidator.equals(
    "all pagination current",
    allResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "all pagination records",
    allResult.pagination.records >= postCount,
  );
  // =========================================
  // Test Case 6: Default time filter (omitted)
  // =========================================
  const defaultResult = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityName: community.name,
      body: {
        sort: "top",
        limit: 100,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(defaultResult);
  // Should behave the same as time='all'
  TestValidator.equals(
    "default time filter returns same count as 'all'",
    defaultResult.data.length,
    allResult.data.length,
  );
  // =========================================
  // Test Case 7: Pagination with top sorting
  // =========================================
  const pageOne = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityName: community.name,
      body: {
        sort: "top",
        time: "all",
        limit: 2,
        page: 1,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(pageOne);
  TestValidator.equals("page 1 current", pageOne.pagination.current, 1);
  TestValidator.equals("page 1 limit", pageOne.pagination.limit, 2);
  TestValidator.predicate(
    "page 1 has at most 2 items",
    pageOne.data.length <= 2,
  );
  // If there are more posts, test page 2
  if (pageOne.pagination.pages > 1) {
    const pageTwo = await api.functional.community.communities.posts.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          sort: "top",
          time: "all",
          limit: 2,
          page: 2,
        } satisfies ICommunityPost.IRequest,
      },
    );
    typia.assert(pageTwo);
    TestValidator.equals("page 2 current", pageTwo.pagination.current, 2);
    // Verify no duplicate posts between pages
    const pageOneIds = new Set(pageOne.data.map((p) => p.id));
    const pageTwoIds = new Set(pageTwo.data.map((p) => p.id));
    const hasDuplicates = [...pageOneIds].some((id) => pageTwoIds.has(id));
    TestValidator.predicate("no duplicate posts between pages", !hasDuplicates);
  }
  // =========================================
  // Test Case 8: Verify community in response
  // =========================================
  if (allResult.data.length > 0) {
    const firstPost = allResult.data[0];
    TestValidator.equals(
      "post belongs to correct community",
      firstPost.community.name,
      community.name,
    );
  }
}
