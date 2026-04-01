import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
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
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test that a member can update a nested reply comment while preserving parent-child relationships.
 *
 * Scenario:
 * 1) Member creates community, subscribes, and creates a post
 * 2) Member creates a top-level comment on the post
 * 3) Member creates a reply comment (nested) to the first comment
 * 4) Member updates the reply comment with new content
 *
 * Validation:
 * - The response returns the updated reply comment with new content
 * - The parent_comment_id remains pointing to the original parent comment
 * - The comment thread structure is preserved
 * - The updated_at timestamp is refreshed
 * - The vote_score and other metadata remain unchanged
 */
export async function test_api_comment_reply_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.name(3),
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create top-level comment (parent comment)
  const parentComment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(parentComment);
  // 6. Create reply comment (nested child) to the parent comment
  const replyComment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: parentComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(replyComment);
  // Store original values for validation
  const originalContent = replyComment.content;
  const originalParentId = replyComment.parentComment?.id;
  const originalVoteScore = replyComment.voteScore;
  const originalCreatedAt = replyComment.createdAt;
  // 7. Update the reply comment with new content
  const newContent = RandomGenerator.paragraph({ sentences: 3 });
  const updatedComment =
    await api.functional.redditCommunity.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: replyComment.id,
        body: {
          content: newContent,
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 8. Validate the update
  // Content should be updated
  TestValidator.equals(
    "content is updated",
    updatedComment.content,
    newContent,
  );
  TestValidator.notEquals(
    "content changed from original",
    updatedComment.content,
    originalContent,
  );
  // Parent comment relationship should be preserved
  TestValidator.equals(
    "parent comment id preserved",
    updatedComment.parentComment?.id,
    originalParentId,
  );
  // Vote score should remain unchanged
  TestValidator.equals(
    "vote score unchanged",
    updatedComment.voteScore,
    originalVoteScore,
  );
  // Created at should remain the same (original creation time)
  TestValidator.equals(
    "created_at unchanged",
    updatedComment.createdAt,
    originalCreatedAt,
  );
  // Updated at should be refreshed (newer than created_at)
  TestValidator.predicate("updated_at is refreshed", () => {
    return (
      new Date(updatedComment.updatedAt) >= new Date(updatedComment.createdAt)
    );
  });
  // Verify parent comment structure is preserved
  TestValidator.predicate("parent comment exists", () => {
    return (
      updatedComment.parentComment !== null &&
      updatedComment.parentComment !== undefined
    );
  });
  // Verify the parent comment is the original parent
  TestValidator.equals(
    "parent comment is original parent",
    updatedComment.parentComment?.id,
    parentComment.id,
  );
}
