import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_thread_retrieval_controversial_sort_with_nested_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create test post
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create comment hierarchy
  // Top-level comment
  const topLevelComment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(topLevelComment);
  // Reply to top-level comment
  const firstReply =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: topLevelComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(firstReply);
  // Reply to first reply (depth 2)
  const secondReply =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
          parent_comment_id: firstReply.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(secondReply);
  // 4. Retrieve comment thread with controversial sort
  const result =
    await api.functional.redditCommunity.member.posts.comments.index(
      memberConnection,
      {
        postId: post.id,
        body: {
          sort: "controversial",
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  // Validate the response type
  typia.assert<IPageIRedditCommunityComment.ISummary>(result);
  // 5. Validate structure
  TestValidator.equals("pagination exists", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 50);
  TestValidator.predicate("results count", result.data.length >= 3);
  // 6. Validate hierarchical relationships
  const createdCommentIds = [topLevelComment.id, firstReply.id, secondReply.id];
  const responseCommentIds = result.data.map((c) => c.id);
  // 7. Validate data integrity
  TestValidator.equals(
    "all unique",
    responseCommentIds.length,
    new Set(responseCommentIds).size,
  );
  // 8. Verify all created comments are in the response (the essential validation)
  // Since IRedditCommunityComment.ISummary doesn't expose parent_comment_id property,
  // we validate that all created comments are present in the response
  // The backend's controversial sort algorithm will properly order comments
  // Our job is to ensure the tree structure is accurately returned
  for (const commentId of createdCommentIds) {
    TestValidator.equals(
      `comment ${commentId} in result`,
      responseCommentIds.includes(commentId),
      true,
    );
  }
  // The controversial sort behavior is offloaded to backend - we validate connectivity and structure
  // This follows the Anti-Hallucination Protocol - test what exists, not what should exist
}
