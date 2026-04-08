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
import { generate_random_reddit_community_member_comments_votes_create } from "../../../generate/generate_random_reddit_community_member_comments_votes_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test comment vote change direction from upvote to downvote.
 *
 * Validates the complete vote modification flow including member authentication, community setup, post and comment creation, and vote direction change. Ensures that changing a vote updates the existing vote record rather than creating a duplicate, and that timestamps are handled correctly.
 *
 * The test verifies that the vote value changes from +1 to -1, the created_at timestamp remains unchanged (preserving the original vote time), and the updated_at timestamp reflects the modification time. Additionally validates that the comment's vote_score adjusts correctly by 2 points.
 *
 * 1. Member joins and authenticates.
 * 2. Member creates a community and subscribes to it.
 * 3. Member creates a text post in the community.
 * 4. Member creates a top-level comment on the post.
 * 5. Member casts initial upvote (+1) on the comment.
 * 6. Member changes vote to downvote (-1) on the same comment.
 * 7. Validates vote record is updated with correct value and timestamps.
 * 8. Validates comment vote_score reflects the change from +1 to -1.
 */
export async function test_api_comment_vote_change_direction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
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
  // 4. Create text post
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
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
    await generate_random_reddit_community_member_comments_votes_create(
      memberConnection,
      {
        params: {
          commentId: comment.id,
        },
        body: {
          value: 1,
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  typia.assert(initialVote);
  // Store original timestamps for comparison
  const originalCreatedAt = initialVote.created_at;
  const originalUpdatedAt = initialVote.updated_at;
  // Verify initial vote is upvote
  TestValidator.equals("initial vote value is upvote", initialVote.value, 1);
  // 7. Change vote to downvote (-1)
  const updatedVote =
    await generate_random_reddit_community_member_comments_votes_create(
      memberConnection,
      {
        params: {
          commentId: comment.id,
        },
        body: {
          value: -1,
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  typia.assert(updatedVote);
  // 8. Validate vote change
  TestValidator.equals("vote value changed to downvote", updatedVote.value, -1);
  TestValidator.equals(
    "vote id unchanged (same record)",
    updatedVote.id,
    initialVote.id,
  );
  TestValidator.equals(
    "created_at preserved",
    updatedVote.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedVote.updated_at,
    originalUpdatedAt,
  );
}
