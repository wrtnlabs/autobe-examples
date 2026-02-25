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

/**
 * Test that an authenticated user can successfully edit their own comment reply within the community platform.
 * The test creates a user account (join as user), creates a community, creates a post in that community,
 * creates a top-level comment on the post, then creates a reply to that comment using a second user account,
 * and finally edits the reply content. Validates that the comment content is updated correctly (1-10,000 characters),
 * updated_at timestamp changes, the thread hierarchy remains intact (parent relationship preserved),
 * and the author information matches the user who created the reply.
 */
export async function test_api_comment_reply_edit_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first user account for community and post creation
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(firstUser);
  // 2. Create community using first user
  const community =
    await generate_random_community_platform_user_communities_create(
      firstUserConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 6,
          }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create post in the community
  const post = await generate_random_community_platform_user_posts_create(
    firstUserConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        community_name: community.name,
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create top-level comment on the post using first user
  const topLevelComment =
    await generate_random_community_platform_user_posts_comments_create(
      firstUserConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: null,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(topLevelComment);
  // 5. Create second user account who will create and edit the reply
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(secondUser);
  // 6. Create reply comment as second user (nested under the top-level comment)
  const replyComment =
    await generate_random_community_platform_user_posts_comments_create(
      secondUserConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: topLevelComment.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(replyComment);
  // Store original timestamp for comparison
  const originalUpdatedAt = replyComment.updated_at;
  // 7. Edit the reply content using the second user's connection
  const updatedContent = RandomGenerator.paragraph({ sentences: 3 });
  const updatedReply =
    await api.functional.communityPlatform.posts.comments.replies.update(
      secondUserConnection,
      {
        postId: post.id,
        commentId: replyComment.id,
        body: {
          content: updatedContent,
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedReply);
  // 8. Validate that the comment content is updated correctly
  TestValidator.equals(
    "content should be updated",
    updatedReply.content,
    updatedContent,
  );
  // 9. Validate that updated_at timestamp changes
  TestValidator.notEquals(
    "updated_at should change",
    updatedReply.updated_at,
    originalUpdatedAt,
  );
  // 10. Validate that thread hierarchy remains intact (parent relationship preserved)
  TestValidator.equals(
    "parent comment should remain the same",
    updatedReply.parent?.id,
    topLevelComment.id,
  );
  // 11. Validate that author information matches the user who created the reply
  TestValidator.equals(
    "author should remain the same",
    updatedReply.author.id,
    secondUser.id,
  );
  // 12. Confirm that vote scores and reply counts are unaffected by content edit
  TestValidator.equals(
    "vote score should remain unchanged",
    updatedReply.vote_score,
    replyComment.vote_score,
  );
  TestValidator.equals(
    "replies count should remain unchanged",
    updatedReply.replies_count,
    replyComment.replies_count,
  );
}
