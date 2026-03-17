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

export async function test_api_community_post_feed_sort_modes(
  connection: api.IConnection,
): Promise<void> {
  // --- Setup: member registration ---
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // --- Setup: create community ---
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // --- Setup: subscribe to community ---
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // --- Setup: create 3 text posts ---
  const post1 = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post2);
  const post3 = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post3);
  // --- Scenario A: sort=new ---
  const feedNew = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedNew);
  TestValidator.predicate(
    "sort=new: 3 posts returned",
    feedNew.data.length === 3,
  );
  // Validate descending created_at order
  for (let i = 0; i < feedNew.data.length - 1; i++) {
    TestValidator.predicate(
      `sort=new: post[${i}].created_at >= post[${i + 1}].created_at`,
      new Date(feedNew.data[i]!.created_at).getTime() >=
        new Date(feedNew.data[i + 1]!.created_at).getTime(),
    );
  }
  // --- Scenario B: sort=hot ---
  const feedHot = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        sort: "hot",
        page: 1,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedHot);
  TestValidator.predicate(
    "sort=hot: 3 posts returned",
    feedHot.data.length === 3,
  );
  // --- Scenario C: sort=top with timeRange=this_week ---
  const feedTopWeek = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        sort: "top",
        timeRange: "this_week",
        page: 1,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedTopWeek);
  TestValidator.predicate(
    "sort=top timeRange=this_week: 3 posts returned",
    feedTopWeek.data.length === 3,
  );
  // Validate vote_score is integer on each post
  for (const post of feedTopWeek.data) {
    TestValidator.predicate(
      "vote_score is integer",
      Number.isInteger(post.vote_score),
    );
  }
  // --- Scenario D: sort=top without timeRange ---
  const feedTopNoRange = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        sort: "top",
        page: 1,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedTopNoRange);
  TestValidator.predicate(
    "sort=top no timeRange: valid response",
    feedTopNoRange.data.length >= 0,
  );
  // --- Scenario E: sort=controversial ---
  const feedControversial =
    await api.functional.community.communities.posts.index(memberConnection, {
      communityId: community.id,
      body: {
        sort: "controversial",
        page: 1,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    });
  typia.assert(feedControversial);
  TestValidator.predicate(
    "sort=controversial: valid response",
    feedControversial.data.length >= 0,
  );
  // --- Pagination validation: limit=2, page=1 ---
  const feedPage1 = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        sort: "new",
        page: 1,
        limit: 2,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedPage1);
  TestValidator.equals(
    "pagination page1 current",
    feedPage1.pagination.current,
    1,
  );
  TestValidator.equals("pagination page1 limit", feedPage1.pagination.limit, 2);
  TestValidator.equals(
    "pagination page1 records",
    feedPage1.pagination.records,
    3,
  );
  TestValidator.equals("pagination page1 pages", feedPage1.pagination.pages, 2);
  TestValidator.predicate(
    "pagination page1 data length == 2",
    feedPage1.data.length === 2,
  );
  // --- Pagination validation: limit=2, page=2 ---
  const feedPage2 = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        sort: "new",
        page: 2,
        limit: 2,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedPage2);
  TestValidator.predicate(
    "pagination page2 data length == 1",
    feedPage2.data.length === 1,
  );
}
