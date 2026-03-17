import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
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
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_posts_keyword_search_and_sort_options(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Setup: Member registration ───────────────────────────────────────
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // ─── 2. Create a community ───────────────────────────────────────────────
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // ─── 3. Subscribe to the community ───────────────────────────────────────
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // ─── 4. Create 15 posts: 7 with keyword, 8 without ───────────────────────
  const KEYWORD = "UniqueSearchTerm2024";
  const KEYWORD_POST_COUNT = 7;
  const NON_KEYWORD_POST_COUNT = 8;
  // Create keyword posts
  await ArrayUtil.asyncRepeat(KEYWORD_POST_COUNT, async (i) => {
    const post = await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: `${KEYWORD} Post Number ${i + 1} ${RandomGenerator.alphabets(6)}`,
          type: "text",
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPost.ICreate,
      },
    );
    typia.assert(post);
  });
  // Create non-keyword posts
  await ArrayUtil.asyncRepeat(NON_KEYWORD_POST_COUNT, async (i) => {
    const post = await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: `Regular Post ${i + 1} ${RandomGenerator.alphabets(6)}`,
          type: "text",
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPost.ICreate,
      },
    );
    typia.assert(post);
  });
  // ─── Scenario A: Keyword Search ───────────────────────────────────────────
  const keywordSearchResult = await api.functional.community.posts.index(
    memberConnection,
    {
      body: {
        keyword: KEYWORD,
        page: 1,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(keywordSearchResult);
  // All returned posts must contain the keyword in their title
  for (const post of keywordSearchResult.data) {
    TestValidator.predicate(
      "post title contains keyword",
      post.title.includes(KEYWORD),
    );
  }
  // Records count should equal the number of keyword posts
  TestValidator.equals(
    "keyword search records count",
    keywordSearchResult.pagination.records,
    KEYWORD_POST_COUNT,
  );
  // ─── Scenario B: Sort by 'new' ────────────────────────────────────────────
  const newSortResult = await api.functional.community.posts.index(
    memberConnection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(newSortResult);
  // Verify descending order by created_at
  for (let i = 0; i < newSortResult.data.length - 1; i++) {
    const current = newSortResult.data[i]!;
    const next = newSortResult.data[i + 1]!;
    TestValidator.predicate(
      `sort by new: post[${i}].created_at >= post[${i + 1}].created_at`,
      current.created_at >= next.created_at,
    );
  }
  // ─── Scenario C: Sort by 'top' with timeRange 'all_time' ─────────────────
  const topSortResult = await api.functional.community.posts.index(
    memberConnection,
    {
      body: {
        sort: "top",
        timeRange: "all_time",
        page: 1,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(topSortResult);
  // Verify descending order by vote_score
  for (let i = 0; i < topSortResult.data.length - 1; i++) {
    const current = topSortResult.data[i]!;
    const next = topSortResult.data[i + 1]!;
    TestValidator.predicate(
      `sort by top: post[${i}].vote_score >= post[${i + 1}].vote_score`,
      current.vote_score >= next.vote_score,
    );
  }
  // ─── Scenario D: Pagination consistency ──────────────────────────────────
  // Page 1 with limit 5 (scoped to our community for deterministic results)
  const page1Result = await api.functional.community.posts.index(
    memberConnection,
    {
      body: {
        communityId: community.id,
        page: 1,
        limit: 5,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(page1Result);
  TestValidator.equals(
    "page 1 current page metadata",
    page1Result.pagination.current,
    1,
  );
  // Page 2 with limit 5
  const page2Result = await api.functional.community.posts.index(
    memberConnection,
    {
      body: {
        communityId: community.id,
        page: 2,
        limit: 5,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 current page metadata",
    page2Result.pagination.current,
    2,
  );
  // Page 1 and page 2 should have different posts
  const page1Ids = new Set(page1Result.data.map((p) => p.id));
  for (const post of page2Result.data) {
    TestValidator.predicate(
      "page 2 post not in page 1",
      !page1Ids.has(post.id),
    );
  }
  // Request a page well beyond total pages → empty data array
  const beyondResult = await api.functional.community.posts.index(
    memberConnection,
    {
      body: {
        communityId: community.id,
        page: 999,
        limit: 5,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(beyondResult);
  TestValidator.equals(
    "beyond total pages returns empty data",
    beyondResult.data.length,
    0,
  );
}
