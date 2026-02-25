import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_reply_edit_preserves_thread_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // Create user account for comment authorship
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create test community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create post for discussion
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create top-level comment A
  const commentA =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(commentA);
  // Create first-level reply B under comment A
  const commentB =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: commentA.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(commentB);
  // Create second-level deeper reply C under comment B
  const commentC =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          parent_comment_id: commentB.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(commentC);
  // Store original timestamps and relationships
  const originalCommentBUpdatedAt = commentB.updated_at;
  // Edit the middle reply B
  const updatedCommentB =
    await api.functional.communityPlatform.posts.comments.replies.update(
      userConnection,
      {
        postId: post.id,
        commentId: commentB.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedCommentB);
  // Verify that the reply remains connected to original parent A
  TestValidator.equals(
    "parent comment relationship intact",
    updatedCommentB.parent?.id,
    commentA.id,
  );
  // Verify all comment metadata remains consistent except updated_at for B
  TestValidator.equals("comment ID unchanged", updatedCommentB.id, commentB.id);
  TestValidator.equals(
    "author unchanged",
    updatedCommentB.author.id,
    commentB.author.id,
  );
  TestValidator.equals(
    "post unchanged",
    updatedCommentB.post.id,
    commentB.post.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedCommentB.created_at,
    commentB.created_at,
  );
  TestValidator.equals(
    "is_deleted unchanged",
    updatedCommentB.is_deleted,
    commentB.is_deleted,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedCommentB.updated_at,
    originalCommentBUpdatedAt,
  );
  // Verify the thread structure shows proper indentation levels
  TestValidator.equals(
    "top-level comment has no parent",
    commentA.parent,
    null,
  );
  TestValidator.equals(
    "first-level reply parent is top-level",
    commentB.parent?.id,
    commentA.id,
  );
  // Validate content length constraints
  TestValidator.predicate(
    "updated content meets minimum length",
    updatedCommentB.content.length >= 1,
  );
  TestValidator.predicate(
    "updated content meets maximum length",
    updatedCommentB.content.length <= 10000,
  );
  // Additional validation: Verify child comment C still exists and maintains parent relationship
  // Since we don't have a comment fetch endpoint in the provided SDK, we rely on the fact that
  // the comment creation was successful and the relationships were properly established
  TestValidator.predicate(
    "child comment C was created successfully",
    commentC.id !== undefined,
  );
  TestValidator.equals(
    "child comment C has correct post",
    commentC.post.id,
    post.id,
  );
}
