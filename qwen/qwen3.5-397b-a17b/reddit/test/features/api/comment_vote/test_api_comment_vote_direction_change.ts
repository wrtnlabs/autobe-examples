import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
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
import { generate_random_reddit_community_comments_votes_vote } from "../../../generate/generate_random_reddit_community_comments_votes_vote";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test changing vote direction on a comment.
 *
 * This test validates the comment voting system correctly handles vote transitions:
 * 1. Setup: Authenticate as member, create community, subscribe, create post, create comment
 * 2. Cast initial UPVOTE on comment
 * 3. Change vote from UPVOTE to DOWNVOTE - verify direction updates
 * 4. Change vote from DOWNVOTE to UPVOTE - verify direction updates
 * 5. Remove vote - verify direction is cleared
 */
export async function test_api_comment_vote_direction_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
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
  // 4. Create post
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create comment on post
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
  // 6. Cast initial UPVOTE
  const upvote = await generate_random_reddit_community_comments_votes_vote(
    memberConnection,
    {
      params: { commentId: comment.id },
      body: {
        direction: "UPVOTE",
      } satisfies IRedditCommunityCommentVote.ICreate,
    },
  );
  typia.assert(upvote);
  TestValidator.equals("vote direction is UPVOTE", upvote.direction, "UPVOTE");
  TestValidator.equals("vote member matches", upvote.member.id, memberAuth.id);
  TestValidator.equals("vote comment matches", upvote.comment.id, comment.id);
  // 7. Change vote from UPVOTE to DOWNVOTE
  const downvote = await generate_random_reddit_community_comments_votes_vote(
    memberConnection,
    {
      params: { commentId: comment.id },
      body: {
        direction: "DOWNVOTE",
      } satisfies IRedditCommunityCommentVote.ICreate,
    },
  );
  typia.assert(downvote);
  TestValidator.equals(
    "vote direction changed to DOWNVOTE",
    downvote.direction,
    "DOWNVOTE",
  );
  TestValidator.notEquals(
    "vote updated_at changed",
    downvote.updated_at,
    downvote.created_at,
  );
  // 8. Change vote from DOWNVOTE to UPVOTE
  const upvoteAgain =
    await generate_random_reddit_community_comments_votes_vote(
      memberConnection,
      {
        params: { commentId: comment.id },
        body: {
          direction: "UPVOTE",
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  typia.assert(upvoteAgain);
  TestValidator.equals(
    "vote direction changed back to UPVOTE",
    upvoteAgain.direction,
    "UPVOTE",
  );
  // 9. Remove vote (set direction to null)
  const removeVote = await generate_random_reddit_community_comments_votes_vote(
    memberConnection,
    {
      params: { commentId: comment.id },
      body: {
        direction: null,
      } satisfies IRedditCommunityCommentVote.ICreate,
    },
  );
  typia.assert(removeVote);
  TestValidator.equals(
    "vote direction is null after removal",
    removeVote.direction,
    null,
  );
  // 10. Cast a new vote to verify voting still works after removal
  const finalUpvote =
    await generate_random_reddit_community_comments_votes_vote(
      memberConnection,
      {
        params: { commentId: comment.id },
        body: {
          direction: "UPVOTE",
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  typia.assert(finalUpvote);
  TestValidator.equals(
    "can vote again after removal",
    finalUpvote.direction,
    "UPVOTE",
  );
}
