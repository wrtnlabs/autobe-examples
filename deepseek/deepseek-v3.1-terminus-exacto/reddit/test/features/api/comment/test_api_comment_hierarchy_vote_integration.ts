import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentHierarchy } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentHierarchy";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
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
import { generate_random_community_platform_user_comments_votes_create } from "../../../generate/generate_random_community_platform_user_comments_votes_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_hierarchy_vote_integration(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create a post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: RandomGenerator.name(1).replace(/\s+/g, "_"),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Create top-level comments
  const comment1 =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment1);
  const comment2 =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment2);
  // Create nested replies
  const reply1 =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: comment1.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(reply1);
  const reply2 =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: reply1.id,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(reply2);
  // Cast votes on different comments to test vote score integration
  // Comment1: upvote (+1)
  const vote1 =
    await generate_random_community_platform_user_comments_votes_create(
      userConnection,
      {
        params: { commentId: comment1.id },
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(vote1);
  // Comment2: downvote (-1)
  const vote2 =
    await generate_random_community_platform_user_comments_votes_create(
      userConnection,
      {
        params: { commentId: comment2.id },
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(vote2);
  // Reply1: upvote (+1)
  const vote3 =
    await generate_random_community_platform_user_comments_votes_create(
      userConnection,
      {
        params: { commentId: reply1.id },
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(vote3);
  // Reply2: no vote (0)
  // Intentionally left without vote to test default vote score
  // Retrieve the comment hierarchy
  const hierarchy =
    await api.functional.communityPlatform.user.posts.comments.hierarchy.invert(
      userConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(hierarchy);
  // Validate vote scores in the hierarchy
  const findCommentInHierarchy = (
    node: ICommunityPlatformCommentHierarchy.IInvert,
    commentId: string,
  ): ICommunityPlatformCommentHierarchy.IInvert | null => {
    if (node.id === commentId) return node;
    for (const child of node.children) {
      const found = findCommentInHierarchy(child, commentId);
      if (found) return found;
    }
    return null;
  };
  // Search through all top-level comments if hierarchy is an array
  const findAllComments = (
    nodes: ICommunityPlatformCommentHierarchy.IInvert[],
    commentId: string,
  ): ICommunityPlatformCommentHierarchy.IInvert | null => {
    for (const node of nodes) {
      const found = findCommentInHierarchy(node, commentId);
      if (found) return found;
    }
    return null;
  };
  // Handle hierarchy as array of top-level comments
  const hierarchyArray = Array.isArray(hierarchy) ? hierarchy : [hierarchy];
  const hierarchyComment1 = findAllComments(hierarchyArray, comment1.id);
  await TestValidator.predicate(
    "comment1 should exist in hierarchy",
    hierarchyComment1 !== null,
  );
  if (hierarchyComment1) {
    TestValidator.equals(
      "comment1 vote score should be +1",
      hierarchyComment1.votes_count,
      1,
    );
  }
  const hierarchyComment2 = findAllComments(hierarchyArray, comment2.id);
  await TestValidator.predicate(
    "comment2 should exist in hierarchy",
    hierarchyComment2 !== null,
  );
  if (hierarchyComment2) {
    TestValidator.equals(
      "comment2 vote score should be -1",
      hierarchyComment2.votes_count,
      -1,
    );
  }
  const hierarchyReply1 = findAllComments(hierarchyArray, reply1.id);
  await TestValidator.predicate(
    "reply1 should exist in hierarchy",
    hierarchyReply1 !== null,
  );
  if (hierarchyReply1) {
    TestValidator.equals(
      "reply1 vote score should be +1",
      hierarchyReply1.votes_count,
      1,
    );
  }
  const hierarchyReply2 = findAllComments(hierarchyArray, reply2.id);
  await TestValidator.predicate(
    "reply2 should exist in hierarchy",
    hierarchyReply2 !== null,
  );
  if (hierarchyReply2) {
    TestValidator.equals(
      "reply2 vote score should be 0 (no votes)",
      hierarchyReply2.votes_count,
      0,
    );
  }
  // Test hierarchical structure
  if (hierarchyComment1 && hierarchyReply1) {
    await TestValidator.predicate(
      "reply1 should be child of comment1",
      findCommentInHierarchy(hierarchyComment1, reply1.id) !== null,
    );
  }
  if (hierarchyReply1 && hierarchyReply2) {
    await TestValidator.predicate(
      "reply2 should be child of reply1",
      findCommentInHierarchy(hierarchyReply1, reply2.id) !== null,
    );
  }
  // Test vote change scenario: change comment1 from upvote to downvote
  const voteChange =
    await generate_random_community_platform_user_comments_votes_create(
      userConnection,
      {
        params: { commentId: comment1.id },
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(voteChange);
  // Retrieve hierarchy again to verify vote score update
  const updatedHierarchy =
    await api.functional.communityPlatform.user.posts.comments.hierarchy.invert(
      userConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(updatedHierarchy);
  const updatedHierarchyArray = Array.isArray(updatedHierarchy)
    ? updatedHierarchy
    : [updatedHierarchy];
  const updatedHierarchyComment1 = findAllComments(
    updatedHierarchyArray,
    comment1.id,
  );
  await TestValidator.predicate(
    "comment1 should exist in updated hierarchy",
    updatedHierarchyComment1 !== null,
  );
  if (updatedHierarchyComment1) {
    TestValidator.equals(
      "comment1 vote score should be -1 after vote change",
      updatedHierarchyComment1.votes_count,
      -1,
    );
  }
}
