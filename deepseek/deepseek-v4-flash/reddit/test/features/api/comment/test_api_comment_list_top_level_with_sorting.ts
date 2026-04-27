import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
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
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_votes_create } from "../../../generate/generate_random_community_platform_member_posts_comments_votes_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_list_top_level_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // ---- Setup ----
  // 1. Register Member A (author who creates community, post, and comments)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  // 3. Subscribe Member A to the community (required before posting)
  await generate_random_community_platform_member_communities_subscribers_create(
    memberAConnection,
    { params: { communityId: community.id } },
  );
  // 4. Create a text post
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
      },
    },
  );
  // 5. Create 5 top-level comments with controlled content
  const commentContents = [
    "Alpha comment — first test comment",
    "Beta comment — second test comment",
    "Gamma comment — third test comment",
    "Delta comment — fourth test comment",
    "Epsilon comment — fifth test comment",
  ];
  const comments = await ArrayUtil.asyncMap(
    commentContents,
    async (content) => {
      return await generate_random_community_platform_member_posts_comments_create(
        memberAConnection,
        {
          body: { content },
          params: { postId: post.id },
        },
      );
    },
  );
  // 6. Register Member B (voter)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 7. Register Member C (second voter for controversial scoring)
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {});
  // 8. Cast votes to create varied scores:
  //    Comment[0]: +1 from B → score=1, votes=1
  await generate_random_community_platform_member_posts_comments_votes_create(
    memberBConnection,
    {
      body: { value: 1 },
      params: { postId: post.id, commentId: comments[0].id },
    },
  );
  //    Comment[1]: -1 from B → score=-1, votes=1
  await generate_random_community_platform_member_posts_comments_votes_create(
    memberBConnection,
    {
      body: { value: -1 },
      params: { postId: post.id, commentId: comments[1].id },
    },
  );
  //    Comment[2]: +1 from B → score=1, votes=1
  await generate_random_community_platform_member_posts_comments_votes_create(
    memberBConnection,
    {
      body: { value: 1 },
      params: { postId: post.id, commentId: comments[2].id },
    },
  );
  //    Comment[3]: +1 from B AND -1 from C → score=0, votes=2 (controversial!)
  await generate_random_community_platform_member_posts_comments_votes_create(
    memberBConnection,
    {
      body: { value: 1 },
      params: { postId: post.id, commentId: comments[3].id },
    },
  );
  await generate_random_community_platform_member_posts_comments_votes_create(
    memberCConnection,
    {
      body: { value: -1 },
      params: { postId: post.id, commentId: comments[3].id },
    },
  );
  //    Comment[4]: +1 from B → score=1, votes=1
  await generate_random_community_platform_member_posts_comments_votes_create(
    memberBConnection,
    {
      body: { value: 1 },
      params: { postId: post.id, commentId: comments[4].id },
    },
  );
  // ---- Test A: sort = 'best' — descending vote_score, then descending created_at ----
  const bestResult =
    await api.functional.communityPlatform.posts.comments.index(
      memberAConnection,
      {
        postId: post.id,
        body: {
          sort: "best",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(bestResult);
  // Validate descending vote_score order
  for (let i = 1; i < bestResult.data.length; i++) {
    TestValidator.predicate(
      `best sort: data[${i - 1}].vote_score >= data[${i}].vote_score`,
      () => bestResult.data[i - 1].vote_score >= bestResult.data[i].vote_score,
    );
  }
  // ---- Test B: sort = 'new' — descending created_at ----
  const newResult = await api.functional.communityPlatform.posts.comments.index(
    memberAConnection,
    {
      postId: post.id,
      body: {
        sort: "new",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(newResult);
  // Validate descending created_at order
  for (let i = 1; i < newResult.data.length; i++) {
    TestValidator.predicate(
      `new sort: data[${i - 1}].created_at >= data[${i}].created_at`,
      () => newResult.data[i - 1].created_at >= newResult.data[i].created_at,
    );
  }
  // ---- Test C: sort = 'controversial' — many total votes, score near zero first ----
  const controversialResult =
    await api.functional.communityPlatform.posts.comments.index(
      memberAConnection,
      {
        postId: post.id,
        body: {
          sort: "controversial",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(controversialResult);
  // Comment[3] has score=0 with 2 votes → should be most controversial (first)
  // The other comments have only 1 vote → less controversial
  TestValidator.equals(
    "controversial sort: most controversial comment first",
    controversialResult.data[0].id,
    comments[3].id,
  );
  // ---- Test D: pagination with smaller limit ----
  const paginatedResult =
    await api.functional.communityPlatform.posts.comments.index(
      memberAConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "paginated data should have at most 2 items",
    () => paginatedResult.data.length <= 2,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 2",
    paginatedResult.pagination.limit,
    2,
  );
  // ---- Validate all results are top-level comments only ----
  for (const result of [
    bestResult,
    newResult,
    controversialResult,
    paginatedResult,
  ]) {
    for (const comment of result.data) {
      TestValidator.equals(
        "only top-level comments (parentComment is null)",
        comment.parentComment,
        null,
      );
    }
  }
}
