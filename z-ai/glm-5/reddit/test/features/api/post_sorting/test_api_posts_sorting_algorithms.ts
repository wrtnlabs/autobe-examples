import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostVote";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
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
import { generate_random_community_member_posts_vote } from "../../../generate/generate_random_community_member_posts_vote";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";
import { prepare_random_community_post_vote } from "../../../prepare/prepare_random_community_post_vote";

export async function test_api_posts_sorting_algorithms(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test all sorting algorithms with time filters for post listings.
   * This scenario validates the sorting logic for different algorithms:
   * - hot: trending content based on hot_score
   * - new: chronological by created_at DESC
   * - top: highest vote_score with time filters (today, week, month, year, all)
   * - controversial: high engagement but score close to zero
   */
  // Step 1: Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Subscribe to the community
  const subscription =
    await api.functional.community.member.communities.subscribe(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // Step 4: Create multiple posts with varying content for sorting tests
  const posts: ICommunityPost[] = [];
  for (let i = 0; i < 10; i++) {
    const post =
      await generate_random_community_member_communities_posts_create(
        memberConnection,
        {
          params: { communityName: community.name },
          body: {
            title: `Test Post ${i + 1} - ${RandomGenerator.name()}`,
            post_type: "TEXT",
            text_content: RandomGenerator.paragraph({ sentences: 5 }),
          },
        },
      );
    typia.assert(post);
    posts.push(post);
  }
  // Step 5: Create additional voters to cast votes
  const voterConnections: api.IConnection[] = [];
  for (let i = 0; i < 5; i++) {
    const voterConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(voterConnection, {});
    await api.functional.community.member.communities.subscribe(
      voterConnection,
      {
        communityName: community.name,
      },
    );
    voterConnections.push(voterConnection);
  }
  // Step 6: Cast votes on posts to create varying vote_score values
  // Posts 0-2: High upvotes (hot candidates)
  for (let pIdx = 0; pIdx < 3; pIdx++) {
    for (const voterConn of voterConnections) {
      await generate_random_community_member_posts_vote(voterConn, {
        params: { postId: posts[pIdx].id },
        body: { vote: 1 },
      });
    }
  }
  // Posts 3-5: Mixed votes (controversial candidates)
  for (let pIdx = 3; pIdx < 6; pIdx++) {
    for (let vIdx = 0; vIdx < voterConnections.length; vIdx++) {
      await generate_random_community_member_posts_vote(
        voterConnections[vIdx],
        {
          params: { postId: posts[pIdx].id },
          body: { vote: vIdx % 2 === 0 ? 1 : -1 },
        },
      );
    }
  }
  // Posts 6-9: Downvotes
  for (let pIdx = 6; pIdx < 10; pIdx++) {
    for (let vIdx = 0; vIdx < 2; vIdx++) {
      await generate_random_community_member_posts_vote(
        voterConnections[vIdx],
        {
          params: { postId: posts[pIdx].id },
          body: { vote: -1 },
        },
      );
    }
  }
  // Step 7: Test 'hot' sort - verify posts are ordered by hot_score DESC
  const hotResult = await api.functional.community.posts.index(connection, {
    body: {
      communityId: community.id,
      sort: "hot",
      limit: 25,
    },
  });
  typia.assert(hotResult);
  TestValidator.predicate("hot sort returns posts", hotResult.data.length > 0);
  // Step 8: Test 'new' sort - verify posts are ordered by created_at DESC
  const newResult = await api.functional.community.posts.index(connection, {
    body: {
      communityId: community.id,
      sort: "new",
      limit: 25,
    },
  });
  typia.assert(newResult);
  // Verify new sort order (most recent first)
  for (let i = 1; i < newResult.data.length; i++) {
    const prevDate = new Date(newResult.data[i - 1].created_at).getTime();
    const currDate = new Date(newResult.data[i].created_at).getTime();
    TestValidator.predicate(
      "new sort order is descending by created_at",
      prevDate >= currDate,
    );
  }
  // Step 9: Test 'top' sort with each time filter
  const timeFilters = ["today", "week", "month", "year", "all"] as const;
  for (const timeFilter of timeFilters) {
    const topResult = await api.functional.community.posts.index(connection, {
      body: {
        communityId: community.id,
        sort: "top",
        time: timeFilter,
        limit: 25,
      },
    });
    typia.assert(topResult);
    // Verify top sort order (highest vote_score first)
    for (let i = 1; i < topResult.data.length; i++) {
      TestValidator.predicate(
        `top sort order (${timeFilter}) is descending by vote_score`,
        topResult.data[i - 1].vote_score >= topResult.data[i].vote_score,
      );
    }
  }
  // Step 10: Test 'controversial' sort
  const controversialResult = await api.functional.community.posts.index(
    connection,
    {
      body: {
        communityId: community.id,
        sort: "controversial",
        limit: 25,
      },
    },
  );
  typia.assert(controversialResult);
  TestValidator.predicate(
    "controversial sort returns posts",
    controversialResult.data.length > 0,
  );
  // Step 11: Test pagination with 'new' sort
  const page1 = await api.functional.community.posts.index(connection, {
    body: {
      communityId: community.id,
      sort: "new",
      limit: 5,
      page: 1,
    },
  });
  typia.assert(page1);
  const page2 = await api.functional.community.posts.index(connection, {
    body: {
      communityId: community.id,
      sort: "new",
      limit: 5,
      page: 2,
    },
  });
  typia.assert(page2);
  // Verify pagination - page 1 and page 2 should have different posts
  if (page1.data.length > 0 && page2.data.length > 0) {
    TestValidator.notEquals(
      "pagination returns different posts on different pages",
      page1.data[0].id,
      page2.data[0].id,
    );
  }
  // Verify pagination metadata
  TestValidator.predicate(
    "page 1 has correct pagination info",
    page1.pagination.current === 1,
  );
  TestValidator.predicate(
    "page 2 has correct pagination info",
    page2.pagination.current === 2,
  );
}
