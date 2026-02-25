import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentHierarchy";
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
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_hierarchy_nested_discussion(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create a post with a generic community name that likely exists
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: "general",
        post_type: "text",
        text_content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create root-level comment
  const rootComment =
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
  typia.assert(rootComment);
  // Create first-level reply to root comment
  const firstLevelReply =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: rootComment.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(firstLevelReply);
  // Create second-level reply to first-level reply
  const secondLevelReply =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: firstLevelReply.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(secondLevelReply);
  // Create another first-level reply to root comment
  const anotherFirstLevelReply =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: rootComment.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(anotherFirstLevelReply);
  // Retrieve the complete comment hierarchy
  const hierarchy =
    await api.functional.communityPlatform.user.posts.comments.hierarchy.invert(
      userConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(hierarchy);
  // Validate hierarchy structure
  TestValidator.predicate(
    "hierarchy should have comments",
    hierarchy.children.length > 0,
  );
  // Find root comment in hierarchy
  const rootCommentInHierarchy = hierarchy.children.find(
    (comment) => comment.id === rootComment.id,
  );
  TestValidator.predicate(
    "root comment should exist in hierarchy",
    rootCommentInHierarchy !== undefined,
  );
  if (rootCommentInHierarchy) {
    // Validate root comment properties
    TestValidator.equals(
      "root comment content",
      rootCommentInHierarchy.content,
      rootComment.content,
    );
    TestValidator.equals(
      "root comment author id",
      rootCommentInHierarchy.author.id,
      user.id,
    );
    TestValidator.predicate(
      "root comment should have children",
      rootCommentInHierarchy.children.length >= 2,
    );
    TestValidator.predicate(
      "root comment should have valid vote count",
      rootCommentInHierarchy.votes_count >= 0,
    );
    TestValidator.predicate(
      "root comment should have valid timestamp",
      new Date(rootCommentInHierarchy.created_at).getTime() > 0,
    );
    // Find first-level replies in hierarchy
    const firstLevelReplyInHierarchy = rootCommentInHierarchy.children.find(
      (comment) => comment.id === firstLevelReply.id,
    );
    TestValidator.predicate(
      "first-level reply should exist",
      firstLevelReplyInHierarchy !== undefined,
    );
    if (firstLevelReplyInHierarchy) {
      // Validate first-level reply properties
      TestValidator.equals(
        "first-level reply content",
        firstLevelReplyInHierarchy.content,
        firstLevelReply.content,
      );
      TestValidator.equals(
        "first-level reply author id",
        firstLevelReplyInHierarchy.author.id,
        user.id,
      );
      TestValidator.predicate(
        "first-level reply should have children",
        firstLevelReplyInHierarchy.children.length >= 1,
      );
      TestValidator.predicate(
        "first-level reply should have valid vote count",
        firstLevelReplyInHierarchy.votes_count >= 0,
      );
      TestValidator.predicate(
        "first-level reply should have valid timestamp",
        new Date(firstLevelReplyInHierarchy.created_at).getTime() > 0,
      );
      // Find second-level reply in hierarchy
      const secondLevelReplyInHierarchy =
        firstLevelReplyInHierarchy.children.find(
          (comment) => comment.id === secondLevelReply.id,
        );
      TestValidator.predicate(
        "second-level reply should exist",
        secondLevelReplyInHierarchy !== undefined,
      );
      if (secondLevelReplyInHierarchy) {
        // Validate second-level reply properties
        TestValidator.equals(
          "second-level reply content",
          secondLevelReplyInHierarchy.content,
          secondLevelReply.content,
        );
        TestValidator.equals(
          "second-level reply author id",
          secondLevelReplyInHierarchy.author.id,
          user.id,
        );
        TestValidator.predicate(
          "second-level reply should have no children",
          secondLevelReplyInHierarchy.children.length === 0,
        );
        TestValidator.predicate(
          "second-level reply should have valid vote count",
          secondLevelReplyInHierarchy.votes_count >= 0,
        );
        TestValidator.predicate(
          "second-level reply should have valid timestamp",
          new Date(secondLevelReplyInHierarchy.created_at).getTime() > 0,
        );
      }
    }
    // Find another first-level reply in hierarchy
    const anotherFirstLevelReplyInHierarchy =
      rootCommentInHierarchy.children.find(
        (comment) => comment.id === anotherFirstLevelReply.id,
      );
    TestValidator.predicate(
      "another first-level reply should exist",
      anotherFirstLevelReplyInHierarchy !== undefined,
    );
    if (anotherFirstLevelReplyInHierarchy) {
      // Validate another first-level reply properties
      TestValidator.equals(
        "another first-level reply content",
        anotherFirstLevelReplyInHierarchy.content,
        anotherFirstLevelReply.content,
      );
      TestValidator.equals(
        "another first-level reply author id",
        anotherFirstLevelReplyInHierarchy.author.id,
        user.id,
      );
      TestValidator.predicate(
        "another first-level reply should have no children",
        anotherFirstLevelReplyInHierarchy.children.length === 0,
      );
      TestValidator.predicate(
        "another first-level reply should have valid vote count",
        anotherFirstLevelReplyInHierarchy.votes_count >= 0,
      );
      TestValidator.predicate(
        "another first-level reply should have valid timestamp",
        new Date(anotherFirstLevelReplyInHierarchy.created_at).getTime() > 0,
      );
    }
    // Validate complete tree structure
    const totalCommentsInHierarchy = countCommentsInHierarchy(
      rootCommentInHierarchy,
    );
    TestValidator.equals(
      "hierarchy should contain all created comments",
      totalCommentsInHierarchy,
      3,
    );
  }
}
// Helper function to count all comments in a hierarchy tree
function countCommentsInHierarchy(
  comment: ICommunityPlatformCommentHierarchy.IInvert,
): number {
  let count = 1; // Count the current comment
  for (const child of comment.children) {
    count += countCommentsInHierarchy(child);
  }
  return count;
}
