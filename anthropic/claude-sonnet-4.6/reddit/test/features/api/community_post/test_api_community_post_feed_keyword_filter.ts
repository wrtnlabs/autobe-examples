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

export async function test_api_community_post_feed_keyword_filter(
  connection: api.IConnection,
): Promise<void> {
  // -----------------------------------------------------------------------
  // 1. Setup: Register a new member
  // -----------------------------------------------------------------------
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // -----------------------------------------------------------------------
  // 2. Create a community
  // -----------------------------------------------------------------------
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  const communityId = community.id;
  // -----------------------------------------------------------------------
  // 3. Subscribe the member to the community
  // -----------------------------------------------------------------------
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId },
    );
  typia.assert(subscription);
  // -----------------------------------------------------------------------
  // 4. Create three posts with distinct titles
  // -----------------------------------------------------------------------
  const postA = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId,
      body: {
        title: "Introduction to TypeScript",
        type: "text",
        body: "TypeScript is a typed superset of JavaScript.",
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(postA);
  const postB = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId,
      body: {
        title: "TypeScript Advanced Patterns",
        type: "text",
        body: "Advanced design patterns using TypeScript.",
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(postB);
  const postC = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId,
      body: {
        title: "Rust Language Overview",
        type: "text",
        body: "An overview of the Rust programming language.",
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(postC);
  // -----------------------------------------------------------------------
  // Scenario A: keyword 'TypeScript' — matches 2 posts
  // -----------------------------------------------------------------------
  const feedA = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityId,
      body: {
        keyword: "TypeScript",
        page: 1,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedA);
  TestValidator.equals(
    "Scenario A: records count should be 2",
    feedA.pagination.records,
    2,
  );
  TestValidator.equals(
    "Scenario A: data length should be 2",
    feedA.data.length,
    2,
  );
  TestValidator.predicate(
    "Scenario A: all returned posts contain TypeScript in title",
    feedA.data.every((post) => post.title.includes("TypeScript")),
  );
  TestValidator.predicate(
    "Scenario A: Post C (Rust) is NOT present",
    !feedA.data.some((post) => post.id === postC.id),
  );
  // -----------------------------------------------------------------------
  // Scenario B: keyword 'Rust' — matches 1 post
  // -----------------------------------------------------------------------
  const feedB = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityId,
      body: {
        keyword: "Rust",
        page: 1,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedB);
  TestValidator.equals(
    "Scenario B: records count should be 1",
    feedB.pagination.records,
    1,
  );
  TestValidator.equals(
    "Scenario B: data length should be 1",
    feedB.data.length,
    1,
  );
  TestValidator.predicate(
    "Scenario B: the returned post title contains Rust",
    feedB.data[0]!.title.includes("Rust"),
  );
  // -----------------------------------------------------------------------
  // Scenario C: keyword 'Python' — matches 0 posts (empty result)
  // -----------------------------------------------------------------------
  const feedC = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityId,
      body: {
        keyword: "Python",
        page: 1,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedC);
  TestValidator.equals(
    "Scenario C: records should be 0",
    feedC.pagination.records,
    0,
  );
  TestValidator.equals(
    "Scenario C: pages should be 0",
    feedC.pagination.pages,
    0,
  );
  TestValidator.equals(
    "Scenario C: data should be empty array",
    feedC.data.length,
    0,
  );
  // -----------------------------------------------------------------------
  // Scenario D: no keyword — all 3 posts
  // -----------------------------------------------------------------------
  const feedD = await api.functional.community.communities.posts.index(
    memberConnection,
    {
      communityId,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedD);
  TestValidator.equals(
    "Scenario D: records should be 3",
    feedD.pagination.records,
    3,
  );
  TestValidator.equals(
    "Scenario D: data length should be 3",
    feedD.data.length,
    3,
  );
}
