import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

/**
 * Test that soft-deleted comments are excluded from the member's comment history retrieval.
 *
 * Validates the complete comment lifecycle including creation, soft-deletion, and history retrieval filtering. Ensures that the comment history endpoint correctly excludes soft-deleted comments from the response while maintaining accurate pagination metadata.
 *
 * The test creates a member account, establishes a community and post for commenting, generates multiple comments, selectively deletes some comments, and verifies that the history endpoint returns only active comments with correct pagination counts.
 *
 * 1. Member registers with valid credentials and receives authentication token.
 * 2. Member creates a community to host the test post.
 * 3. Member creates a text post in the community.
 * 4. Member creates 5 comments on the post.
 * 5. Member deletes 2 of the 5 comments using soft-delete.
 * 6. Member retrieves comment history via username endpoint.
 * 7. Validates response contains exactly 3 comments (not 5).
 * 8. Validates pagination records count is 3.
 * 9. Validates deleted comment IDs are not present in response.
 */
export async function test_api_member_comment_history_excludes_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  const username = memberAuth.username;
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create post in community
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  typia.assert(post);
  // 4. Create 5 comments on the post
  const comments: IRedditCommunityComment[] = [];
  for (let i = 0; i < 5; i++) {
    const comment =
      await generate_random_reddit_community_member_posts_comments_create(
        memberConnection,
        {
          params: { postId: post.id },
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 5. Delete 2 comments (first two)
  const deletedCommentIds: string[] = [];
  for (let i = 0; i < 2; i++) {
    await api.functional.redditCommunity.member.posts.comments.erase(
      memberConnection,
      {
        postId: post.id,
        commentId: comments[i].id,
      },
    );
    deletedCommentIds.push(comments[i].id);
  }
  // 6. Retrieve comment history
  const history =
    await api.functional.redditCommunity.member.members.comments.list(
      memberConnection,
      {
        username: username,
      },
    );
  typia.assert(history);
  // 7. Validate response contains exactly 3 comments
  TestValidator.equals("comment count", history.data.length, 3);
  // 8. Validate pagination records count is 3
  TestValidator.equals("pagination records", history.pagination.records, 3);
  // 9. Validate deleted comment IDs are not present
  const returnedCommentIds = history.data.map((c) => c.id);
  for (const deletedId of deletedCommentIds) {
    TestValidator.predicate(
      `deleted comment ${deletedId} not in response`,
      !returnedCommentIds.includes(deletedId),
    );
  }
  // 10. Validate all returned comments have valid content
  for (const comment of history.data) {
    TestValidator.predicate("comment has content", comment.content.length > 0);
    TestValidator.equals(
      "comment author matches",
      comment.author.username,
      username,
    );
  }
}
