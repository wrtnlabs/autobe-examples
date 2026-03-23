import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that an authenticated member can retrieve their complete comment history across all posts and communities.
 *
 * This test verifies:
 * 1. Member registration and authentication
 * 2. Community creation for posting context
 * 3. Post creation in the community
 * 4. Multiple comment creation (top-level and nested replies)
 * 5. Comment history retrieval with proper pagination
 * 6. Comment data structure validation including author, post, and parent references
 * 7. Chronological ordering (newest first)
 */
export async function test_api_comment_history_with_existing_comments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  typia.assert(post);
  // 4. Create multiple comments (top-level and nested replies)
  const comment1 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "This is the first top-level comment",
        },
      },
    );
  typia.assert(comment1);
  const comment2 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "This is the second top-level comment",
        },
      },
    );
  typia.assert(comment2);
  const comment3 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "This is a reply to the first comment",
          parent_id: comment1.id,
        },
      },
    );
  typia.assert(comment3);
  // 5. Retrieve comment history
  const history =
    await api.functional.redditClone.member.me.comments.history(
      memberConnection,
    );
  typia.assert(history);
  // 6. Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    history.pagination,
    history.pagination,
  );
  TestValidator.predicate("has records", history.pagination.records > 0);
  TestValidator.equals(
    "records count matches data length",
    history.pagination.records,
    history.data.length,
  );
  // 7. Validate comments are present
  TestValidator.predicate(
    "contains created comments",
    history.data.length >= 3,
  );
  // 8. Validate chronological ordering (newest first)
  if (history.data.length >= 2) {
    TestValidator.predicate(
      "comments ordered by created_at descending",
      new Date(history.data[0].created_at).getTime() >=
        new Date(history.data[1].created_at).getTime(),
    );
  }
  // 9. Validate comment structure for each comment
  await ArrayUtil.asyncForEach(history.data, async (comment, index) => {
    // Validate author is the authenticated member
    TestValidator.equals(
      `comment ${index} author matches member`,
      comment.author.id,
      member.id,
    );
    // Validate post reference exists
    TestValidator.predicate(
      `comment ${index} has post`,
      comment.post.id !== undefined,
    );
    // Validate parent field structure
    if (comment.parent !== null) {
      TestValidator.predicate(
        `comment ${index} parent has id`,
        comment.parent.id !== undefined,
      );
    } else {
      TestValidator.predicate(
        `comment ${index} is top-level or parent deleted`,
        comment.parent === null,
      );
    }
    // Validate comment content exists
    TestValidator.predicate(
      `comment ${index} has content`,
      comment.content.length > 0,
    );
    // Validate score exists
    TestValidator.predicate(
      `comment ${index} has score`,
      typeof comment.score === "number",
    );
  });
  // 10. Validate specific comments exist in history
  const commentIds = history.data.map((c) => c.id);
  TestValidator.predicate(
    "comment1 exists in history",
    commentIds.includes(comment1.id),
  );
  TestValidator.predicate(
    "comment2 exists in history",
    commentIds.includes(comment2.id),
  );
  TestValidator.predicate(
    "comment3 exists in history",
    commentIds.includes(comment3.id),
  );
}
