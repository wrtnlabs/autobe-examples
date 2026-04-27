import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_deleted_with_replies_placeholder(
  connection: api.IConnection,
): Promise<void> {
  //----
  // Setup: create member, community, subscribe, and create a post
  //----
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  await generate_random_community_platform_member_communities_subscribers_create(
    memberConnection,
    {
      params: { communityId: community.id },
    },
  );
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies DeepPartial<ICommunityPlatformPost.ICreate>,
    },
  );
  typia.assert(post);
  //----
  // Create comments for the deletion test
  //----
  // Comment A: top-level comment that will be deleted WITHOUT children
  const commentA =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "Comment A - will be deleted without children",
        } satisfies DeepPartial<ICommunityPlatformComment.ICreate>,
      },
    );
  typia.assert(commentA);
  // Comment B: top-level comment that will be deleted WITH children
  const commentB =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "Comment B - will be deleted with children",
        } satisfies DeepPartial<ICommunityPlatformComment.ICreate>,
      },
    );
  typia.assert(commentB);
  // Child replies to Comment B
  const replyB1 =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "Reply B1 - child of Comment B",
          commentId: commentB.id,
        } satisfies DeepPartial<ICommunityPlatformComment.ICreate>,
      },
    );
  typia.assert(replyB1);
  const replyB2 =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "Reply B2 - child of Comment B",
          commentId: commentB.id,
        } satisfies DeepPartial<ICommunityPlatformComment.ICreate>,
      },
    );
  typia.assert(replyB2);
  // Comment C: top-level comment that remains active
  const commentC =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "Comment C - remains active",
        } satisfies DeepPartial<ICommunityPlatformComment.ICreate>,
      },
    );
  typia.assert(commentC);
  //----
  // Delete Comment A (no children) and Comment B (has children)
  //----
  await api.functional.communityPlatform.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: commentA.id,
    },
  );
  await api.functional.communityPlatform.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: commentB.id,
    },
  );
  //----
  // Test A: Fetch top-level comments and verify deletion behavior
  //----
  const topLevelPage =
    await api.functional.communityPlatform.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(topLevelPage);
  const topComments = topLevelPage.data;
  // Comment A (deleted, no children) should be completely absent
  const foundA = topComments.find((c) => c.id === commentA.id);
  TestValidator.predicate(
    "deleted comment without children is filtered out",
    foundA === undefined,
  );
  // Comment B (deleted, has children) should appear as placeholder with deleted_at set
  const foundB = topComments.find((c) => c.id === commentB.id);
  TestValidator.predicate(
    "deleted comment with children appears as placeholder",
    foundB !== undefined,
  );
  TestValidator.predicate(
    "placeholder has deleted_at timestamp",
    foundB!.deleted_at !== null,
  );
  // Comment C (active) should appear with full content and deleted_at null
  const foundC = topComments.find((c) => c.id === commentC.id);
  TestValidator.predicate("active comment is present", foundC !== undefined);
  TestValidator.predicate(
    "active comment has deleted_at null",
    foundC!.deleted_at === null,
  );
  TestValidator.equals(
    "active comment has correct content",
    foundC!.content,
    "Comment C - remains active",
  );
  //----
  // Test B: Fetch child replies to Comment B — verify they are still accessible
  //----
  const repliesPage =
    await api.functional.communityPlatform.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          page: 1,
          limit: 100,
          parentCommentId: commentB.id,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(repliesPage);
  const replies = repliesPage.data;
  TestValidator.equals(
    "child replies are still accessible after parent deletion",
    replies.length,
    2,
  );
  // Verify the child replies' parentComment reflects the deleted parent
  for (const reply of replies) {
    TestValidator.predicate(
      "child reply references the deleted parent",
      reply.parentComment !== null && reply.parentComment.id === commentB.id,
    );
  }
}
