import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
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
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test comment vote removal functionality for member accounts.
 *
 * Validates the complete vote removal workflow including member authentication, community setup, post and comment creation, initial vote casting, and vote removal via soft-delete. Ensures that removing a vote by setting value to 0 properly soft-deletes the vote record while preserving the audit trail.
 *
 * The test verifies that the vote record maintains its original id after removal, the deleted_at timestamp is set to indicate soft-delete status, and the vote no longer contributes to the comment's vote score calculation.
 *
 * 1. Member registers with email, password, and username.
 * 2. Member creates a community with name, description, and icon.
 * 3. Member subscribes to the created community.
 * 4. Member creates a text post in the community.
 * 5. Member creates a comment on the post.
 * 6. Member casts an initial upvote (+1) on the comment.
 * 7. Member removes their vote by setting value to 0.
 * 8. Validates the vote record is soft-deleted with deleted_at timestamp set.
 */
export async function test_api_comment_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create comment
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Cast initial upvote (+1)
  const initialVote =
    await api.functional.redditCommunity.member.comments.votes.patchByCommentid(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          value: 1,
        } satisfies IRedditCommunityCommentVote.IUpdate,
      },
    );
  typia.assert(initialVote);
  TestValidator.equals("initial vote value", initialVote.value, 1);
  TestValidator.predicate(
    "initial vote not deleted",
    initialVote.deleted_at === null,
  );
  // 7. Remove vote by setting value to 0
  const removedVote =
    await api.functional.redditCommunity.member.comments.votes.patchByCommentid(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          value: 0,
        } satisfies IRedditCommunityCommentVote.IUpdate,
      },
    );
  typia.assert(removedVote);
  // 8. Validate vote removal
  TestValidator.equals("vote id unchanged", removedVote.id, initialVote.id);
  TestValidator.predicate("vote soft-deleted", removedVote.deleted_at !== null);
  TestValidator.predicate("deleted_at is valid timestamp", () => {
    const deletedAt = new Date(removedVote.deleted_at!);
    return !isNaN(deletedAt.getTime());
  });
  TestValidator.predicate("deleted_at after created_at", () => {
    const createdAt = new Date(removedVote.created_at);
    const deletedAt = new Date(removedVote.deleted_at!);
    return deletedAt.getTime() >= createdAt.getTime();
  });
}
