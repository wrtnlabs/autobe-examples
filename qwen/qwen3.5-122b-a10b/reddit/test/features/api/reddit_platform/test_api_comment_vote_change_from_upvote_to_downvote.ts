import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_posts_comments_votes_vote } from "../../../generate/generate_random_reddit_platform_member_posts_comments_votes_vote";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test that a member can change their existing vote on a comment from upvote to downvote.
 * This scenario validates vote modification business logic.
 *
 * **Setup:**
 * 1. Create two authenticated members (voter and comment author)
 * 2. Create a community and subscribe the voter
 * 3. Create a post in the community by the comment author
 * 4. Create a comment on the post by the comment author
 * 5. Cast an initial upvote on the comment by the voter
 *
 * **Test Steps:**
 * 1. Change the vote from upvote (vote_type = +1) to downvote (vote_type = -1)
 * 2. Verify the existing vote record is updated (not a new record created)
 * 3. Verify the updated_at timestamp reflects the vote modification
 *
 * **Expected Results:**
 * - Vote record is updated with new vote_type = -1
 * - Same vote record ID is maintained (UPDATE, not INSERT)
 * - Transaction ensures vote update and score recalculation are atomic
 */
export async function test_api_comment_vote_change_from_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create voter member
  const voterJoinResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(voterJoinResult);
  const voterConnection: api.IConnection = { host: connection.host };
  voterConnection.headers = { Authorization: voterJoinResult.token.access };
  // 2. Create comment author member
  const authorJoinResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorJoinResult);
  const authorConnection: api.IConnection = { host: connection.host };
  authorConnection.headers = { Authorization: authorJoinResult.token.access };
  // 3. Create community (author becomes owner)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Subscribe voter to community
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      voterConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 5. Create post by author
  const post = await generate_random_reddit_platform_member_posts_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create comment by author
  const comment =
    await generate_random_reddit_platform_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 7. Cast initial upvote by voter
  const initialVote =
    await generate_random_reddit_platform_member_posts_comments_votes_vote(
      voterConnection,
      {
        params: {
          postId: post.id,
          commentId: comment.id,
        },
        body: {
          vote_type: 1,
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(initialVote);
  // Verify initial vote score is +1
  TestValidator.equals("initial vote score", initialVote.vote_type, 1);
  // 8. Change vote from upvote to downvote
  const updatedVote =
    await generate_random_reddit_platform_member_posts_comments_votes_vote(
      voterConnection,
      {
        params: {
          postId: post.id,
          commentId: comment.id,
        },
        body: {
          vote_type: -1,
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(updatedVote);
  // 9. Verify vote was updated (same ID, different vote_type)
  TestValidator.equals(
    "vote record ID maintained",
    updatedVote.id,
    initialVote.id,
  );
  TestValidator.equals("vote changed to downvote", updatedVote.vote_type, -1);
  // 10. Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedVote.updated_at,
    initialVote.updated_at,
  );
}
