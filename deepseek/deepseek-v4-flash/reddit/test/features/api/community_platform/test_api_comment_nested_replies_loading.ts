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

export async function test_api_comment_nested_replies_loading(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create actor connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Register a new member
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  const memberId = authorized.id;
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Create a text post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create a top-level comment (this will be the parent for child replies)
  const parentComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          commentId: null,
        },
        params: { postId: post.id },
      },
    );
  typia.assert(parentComment);
  // 6. Create multiple child replies to the parent comment
  const childReplyCount = 3;
  const childReplies: ICommunityPlatformComment[] = [];
  for (let i = 0; i < childReplyCount; i++) {
    const reply =
      await generate_random_community_platform_member_posts_comments_create(
        memberConnection,
        {
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
            commentId: parentComment.id,
          },
          params: { postId: post.id },
        },
      );
    typia.assert(reply);
    childReplies.push(reply);
  }
  // 7. Create additional top-level comments (to verify filtering)
  const otherComment1 =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          commentId: null,
        },
        params: { postId: post.id },
      },
    );
  typia.assert(otherComment1);
  const otherComment2 =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          commentId: null,
        },
        params: { postId: post.id },
      },
    );
  typia.assert(otherComment2);
  // A. Fetch without parentCommentId — verify all top-level comments are returned
  const topLevelResult =
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
  typia.assert(topLevelResult);
  // Should have 3 top-level comments: parentComment, otherComment1, otherComment2
  TestValidator.equals(
    "top-level comment count",
    topLevelResult.data.length,
    3,
  );
  // Verify the parent comment is among the top-level results
  const returnedParent = topLevelResult.data.find(
    (c) => c.id === parentComment.id,
  );
  TestValidator.predicate(
    "parent comment found in top-level",
    !!returnedParent,
  );
  // B. Fetch with parentCommentId — verify only direct child replies are returned
  const childResult =
    await api.functional.communityPlatform.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          page: 1,
          limit: 100,
          parentCommentId: parentComment.id,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(childResult);
  // Should have exactly childReplyCount child replies
  TestValidator.equals(
    "child reply count",
    childResult.data.length,
    childReplyCount,
  );
  // C. Verify each returned reply has the correct parentComment reference
  for (const reply of childResult.data) {
    TestValidator.predicate(
      "child reply has parentComment reference",
      reply.parentComment !== null &&
        reply.parentComment.id === parentComment.id,
    );
  }
  // D. Verify the reply_count field on the parent comment matches the number of children
  TestValidator.equals(
    "reply_count matches child count",
    returnedParent!.reply_count,
    childReplyCount,
  );
  // E. Verify pagination works for child replies (limit/offset)
  const paginatedResult =
    await api.functional.communityPlatform.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          page: 1,
          limit: 2,
          parentCommentId: parentComment.id,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Should return at most 2 child replies (limited by limit=2)
  TestValidator.equals(
    "paginated child reply count",
    paginatedResult.data.length,
    2,
  );
  TestValidator.equals(
    "total records matches child count",
    paginatedResult.pagination.records,
    childReplyCount,
  );
  TestValidator.equals(
    "total pages correct",
    paginatedResult.pagination.pages,
    Math.ceil(childReplyCount / 2),
  );
}
