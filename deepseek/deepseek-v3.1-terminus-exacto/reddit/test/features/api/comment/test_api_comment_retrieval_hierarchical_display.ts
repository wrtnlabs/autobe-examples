import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_comments_replies_create } from "../../../generate/generate_random_community_platform_user_posts_comments_replies_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test comment hierarchy and threaded display with unlimited nesting depth.
 * Create a deeply nested comment thread (5+ levels deep) to verify the comment system
 * supports unlimited nesting as specified in requirements. Validate that parent-child
 * relationships are correctly established via parent_comment_id. Test filtering with
 * parent_comment_id=null to retrieve only top-level comments, then use specific
 * parent_comment_id to fetch nested replies. Ensure deleted comments and replies
 * are appropriately filtered out. Verify that each comment returned includes proper
 * nesting depth indicators, parent relationships, and replies_count for accurate
 * threaded display.
 */
export async function test_api_comment_retrieval_hierarchical_display(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create a post for comments
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_name: "general", // Use a common community name
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create a deeply nested comment thread (5+ levels)
  // Array to store comment IDs for tracking
  const commentThreadIds: string[] = [];
  // Level 1: Top-level comment
  const level1Comment =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: null,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(level1Comment);
  commentThreadIds.push(level1Comment.id);
  // Level 2: Reply to level 1
  const level2Comment =
    await generate_random_community_platform_user_posts_comments_replies_create(
      userConnection,
      {
        params: { postId: post.id, commentId: level1Comment.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: level1Comment.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(level2Comment);
  commentThreadIds.push(level2Comment.id);
  // Level 3: Reply to level 2
  const level3Comment =
    await generate_random_community_platform_user_posts_comments_replies_create(
      userConnection,
      {
        params: { postId: post.id, commentId: level2Comment.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: level2Comment.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(level3Comment);
  commentThreadIds.push(level3Comment.id);
  // Level 4: Reply to level 3
  const level4Comment =
    await generate_random_community_platform_user_posts_comments_replies_create(
      userConnection,
      {
        params: { postId: post.id, commentId: level3Comment.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: level3Comment.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(level4Comment);
  commentThreadIds.push(level4Comment.id);
  // Level 5: Reply to level 4
  const level5Comment =
    await generate_random_community_platform_user_posts_comments_replies_create(
      userConnection,
      {
        params: { postId: post.id, commentId: level4Comment.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: level4Comment.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(level5Comment);
  commentThreadIds.push(level5Comment.id);
  // Test 1: Retrieve top-level comments only (parent_comment_id = null)
  const topLevelComments =
    await api.functional.communityPlatform.posts.comments.index(
      userConnection,
      {
        postId: post.id,
        body: {
          parent_comment_id: null,
          sort: "new",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(topLevelComments);
  // Verify only top-level comments are returned
  TestValidator.equals(
    "top-level comments count",
    topLevelComments.data.length,
    1,
  );
  TestValidator.equals(
    "top-level comment ID matches",
    topLevelComments.data[0].id,
    level1Comment.id,
  );
  TestValidator.predicate(
    "top-level comment has no parent",
    topLevelComments.data[0].parent === null,
  );
  // Test 2: Retrieve replies to level 1 comment
  const level1Replies =
    await api.functional.communityPlatform.posts.comments.index(
      userConnection,
      {
        postId: post.id,
        body: {
          parent_comment_id: level1Comment.id,
          sort: "new",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(level1Replies);
  // Verify replies to level 1 comment
  TestValidator.equals("level 1 replies count", level1Replies.data.length, 1);
  TestValidator.equals(
    "level 1 reply ID matches",
    level1Replies.data[0].id,
    level2Comment.id,
  );
  TestValidator.predicate(
    "level 1 reply has correct parent",
    level1Replies.data[0].parent !== null &&
      level1Replies.data[0].parent!.id === level1Comment.id,
  );
  // Test 3: Retrieve replies to level 2 comment
  const level2Replies =
    await api.functional.communityPlatform.posts.comments.index(
      userConnection,
      {
        postId: post.id,
        body: {
          parent_comment_id: level2Comment.id,
          sort: "new",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(level2Replies);
  // Verify replies to level 2 comment
  TestValidator.equals("level 2 replies count", level2Replies.data.length, 1);
  TestValidator.equals(
    "level 2 reply ID matches",
    level2Replies.data[0].id,
    level3Comment.id,
  );
  // Test 4: Retrieve replies to level 3 comment
  const level3Replies =
    await api.functional.communityPlatform.posts.comments.index(
      userConnection,
      {
        postId: post.id,
        body: {
          parent_comment_id: level3Comment.id,
          sort: "new",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(level3Replies);
  // Verify replies to level 3 comment
  TestValidator.equals("level 3 replies count", level3Replies.data.length, 1);
  TestValidator.equals(
    "level 3 reply ID matches",
    level3Replies.data[0].id,
    level4Comment.id,
  );
  // Test 5: Retrieve replies to level 4 comment
  const level4Replies =
    await api.functional.communityPlatform.posts.comments.index(
      userConnection,
      {
        postId: post.id,
        body: {
          parent_comment_id: level4Comment.id,
          sort: "new",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(level4Replies);
  // Verify replies to level 4 comment
  TestValidator.equals("level 4 replies count", level4Replies.data.length, 1);
  TestValidator.equals(
    "level 4 reply ID matches",
    level4Replies.data[0].id,
    level5Comment.id,
  );
  // Test 6: Verify replies_count is accurate
  TestValidator.equals(
    "level 1 comment replies_count",
    topLevelComments.data[0].replies_count,
    1,
  );
  TestValidator.equals(
    "level 2 comment replies_count",
    level1Replies.data[0].replies_count,
    1,
  );
  TestValidator.equals(
    "level 3 comment replies_count",
    level2Replies.data[0].replies_count,
    1,
  );
  TestValidator.equals(
    "level 4 comment replies_count",
    level3Replies.data[0].replies_count,
    1,
  );
  // Test 7: Verify comment ordering within threads
  TestValidator.predicate(
    "comments are ordered by creation time",
    topLevelComments.data[0].created_at <= level1Replies.data[0].created_at,
  );
  // Test 8: Verify vote_score and author information
  TestValidator.predicate(
    "vote_score is a number",
    typeof topLevelComments.data[0].vote_score === "number",
  );
  TestValidator.predicate(
    "author information is present",
    topLevelComments.data[0].author !== null &&
      typeof topLevelComments.data[0].author.id === "string",
  );
  // Test 9: Verify post information
  TestValidator.equals(
    "post ID matches",
    topLevelComments.data[0].post.id,
    post.id,
  );
  // Test 10: Verify hierarchical relationships are maintained
  TestValidator.predicate(
    "level 5 comment has correct parent chain",
    level4Replies.data[0].parent !== null &&
      level4Replies.data[0].parent!.id === level4Comment.id,
  );
}
