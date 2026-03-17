import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
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
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_posts_vote_create } from "../../../generate/generate_random_community_platform_member_posts_vote_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_popular_feed_top_time_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create member1 (author) and member2 (voter)
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  // Member1 creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      member1Connection,
      {},
    );
  // Member1 creates multiple posts in the community
  const posts = await ArrayUtil.asyncRepeat(5, async () => {
    return await generate_random_community_platform_member_communities_posts_create(
      member1Connection,
      {
        params: { communityId: community.id },
      },
    );
  });
  // Member2 upvotes first 3 posts to create vote score differentials
  // Posts 0, 1, 2 will have voteScore = 1; Posts 3, 4 will have voteScore = 0
  for (let i = 0; i < 3; i++) {
    await generate_random_community_platform_member_posts_vote_create(
      member2Connection,
      {
        params: { postId: posts[i].id },
        body: {
          targetType: "post",
          targetId: posts[i].id,
          voteType: "upvote",
        },
      },
    );
  }
  // Test 1: Get Popular Feed with sort='top' and time_range='today'
  const todayResult = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        sort: "top",
        time_range: "today",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(todayResult);
  // Test 2: Get Popular Feed with sort='top' and time_range='week'
  const weekResult = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        sort: "top",
        time_range: "week",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(weekResult);
  // Test 3: Get Popular Feed with sort='top' and time_range='all'
  const allResult = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        sort: "top",
        time_range: "all",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(allResult);
  // Verify all our posts appear in all time ranges (since they're all recent)
  const ourPostIds = new Set(posts.map((p) => p.id));
  const todayOurPosts = todayResult.data.filter((p) => ourPostIds.has(p.id));
  const weekOurPosts = weekResult.data.filter((p) => ourPostIds.has(p.id));
  const allOurPosts = allResult.data.filter((p) => ourPostIds.has(p.id));
  TestValidator.equals(
    "today result contains all our posts",
    todayOurPosts.length,
    posts.length,
  );
  TestValidator.equals(
    "week result contains all our posts",
    weekOurPosts.length,
    posts.length,
  );
  TestValidator.equals(
    "all result contains all our posts",
    allOurPosts.length,
    posts.length,
  );
  // Verify results are sorted by voteScore DESC (top sorting)
  for (let i = 0; i < allResult.data.length - 1; i++) {
    TestValidator.predicate(
      "posts sorted by voteScore DESC",
      allResult.data[i].voteScore >= allResult.data[i + 1].voteScore,
    );
  }
  // Verify pagination works correctly
  TestValidator.equals("current page is 1", allResult.pagination.current, 1);
  TestValidator.predicate(
    "pagination has records",
    allResult.pagination.records >= posts.length,
  );
}
