import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {},
  });
  const memberId = memberAuth.id;
  // Setup: Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // Setup: Subscribe to the community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // Setup: Create a post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        contentType: "text",
        textContent: RandomGenerator.content({ paragraphs: 2 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // Setup: Create 25 comments to ensure pagination works
  const totalComments = 25;
  const createdComments = [];
  for (let i = 0; i < totalComments; i++) {
    const comment =
      await generate_random_community_platform_member_posts_comments_create(
        memberConnection,
        {
          params: { postId: post.id },
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }
  // Execution: Get first page of comments with limit=10
  const limit = 10;
  const firstPage =
    await api.functional.communityPlatform.member.comments.history(
      memberConnection,
      {
        body: {
          authorId: memberId,
          limit: limit,
          page: 1,
        },
      },
    );
  typia.assert(firstPage);
  // Validation: First page returns exactly limit number of comments
  TestValidator.equals(
    "first page comment count",
    firstPage.data.length,
    limit,
  );
  // Validation: Pagination metadata
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", firstPage.pagination.limit, limit);
  TestValidator.equals(
    "pagination total records",
    firstPage.pagination.records,
    totalComments,
  );
  TestValidator.predicate(
    "pagination pages correct",
    firstPage.pagination.pages === Math.ceil(totalComments / limit),
  );
  // Execution: Get second page of comments
  const secondPage =
    await api.functional.communityPlatform.member.comments.history(
      memberConnection,
      {
        body: {
          authorId: memberId,
          limit: limit,
          page: 2,
        },
      },
    );
  typia.assert(secondPage);
  // Validation: Second page returns exactly limit number of comments
  TestValidator.equals(
    "second page comment count",
    secondPage.data.length,
    limit,
  );
  // Validation: Second page has different comments than first page
  const firstPageIds = new Set(firstPage.data.map((c) => c.id));
  const secondPageIds = new Set(secondPage.data.map((c) => c.id));
  const hasOverlap = [...secondPageIds].some((id) => firstPageIds.has(id));
  TestValidator.predicate("no duplicate comments between pages", !hasOverlap);
  // Execution: Get third page (should have remaining comments)
  const thirdPage =
    await api.functional.communityPlatform.member.comments.history(
      memberConnection,
      {
        body: {
          authorId: memberId,
          limit: limit,
          page: 3,
        },
      },
    );
  typia.assert(thirdPage);
  // Validation: Third page has remaining comments (25 - 10 - 10 = 5)
  TestValidator.equals("third page comment count", thirdPage.data.length, 5);
  // Validation: All comments are from the same author
  const allComments = [
    ...firstPage.data,
    ...secondPage.data,
    ...thirdPage.data,
  ];
  TestValidator.predicate(
    "all comments from same author",
    allComments.every((c) => c.author.id === memberId),
  );
  // Validation: Comments are ordered by created_at DESC (newest first)
  for (let i = 1; i < firstPage.data.length; i++) {
    const prev = new Date(firstPage.data[i - 1].createdAt);
    const curr = new Date(firstPage.data[i].createdAt);
    TestValidator.predicate(
      "comments ordered DESC by created_at",
      prev >= curr,
    );
  }
  // Validation: Each comment has valid post reference
  TestValidator.predicate(
    "all comments have valid post reference",
    allComments.every((c) => c.post.id === post.id),
  );
}
