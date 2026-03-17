import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import type { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
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

/**
 * Test changing comment vote direction from upvote to downvote.
 *
 * Business Logic:
 * 1. Member registers and authenticates
 * 2. Creates a post with an assumed existing community_id
 * 3. Creates a comment on the post
 * 4. Updates vote direction from upvote to downvote
 * 5. Verifies the vote record shows correct direction change
 *
 * Note: Since there's no cast/create vote API, we use the update API.
 * This assumes the vote exists or can be created via update.
 */
export async function test_api_vote_change_comment_direction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://example.com/join",
      referrer: "http://example.com",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // memberConnection.headers updated automatically by authorize_member_join
  // 2. Create a post with assumed community (community must exist in test DB)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Test post for vote change",
        community_id: communityId,
        post_type: "text",
        body: "Test content",
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  console.log(`Created post: ${post.id}`);
  // 3. Create a comment on the post
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          body: "Test comment for vote direction change",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  console.log(
    `Created comment: ${comment.id}, initial vote_score: ${comment.vote_score}`,
  );
  // 4. Create/update vote on comment with upvote
  const voteId = typia.random<string & tags.Format<"uuid">>();
  const upvoteResult = await api.functional.redditCommunity.member.votes.update(
    memberConnection,
    {
      voteId,
      body: {
        vote_type: "upvote",
      } satisfies IRedditCommunityVote.IUpdate,
    },
  );
  typia.assert(upvoteResult);
  console.log(
    `Created upvote: ${upvoteResult.id}, vote_type: ${upvoteResult.vote_type}`,
  );
  // 5. Update vote from upvote to downvote
  const updatedVote = await api.functional.redditCommunity.member.votes.update(
    memberConnection,
    {
      voteId: upvoteResult.id,
      body: {
        vote_type: "downvote",
      } satisfies IRedditCommunityVote.IUpdate,
    },
  );
  typia.assert(updatedVote);
  console.log(`Updated vote to downvote: ${updatedVote.vote_type}`);
  // 6. Verify vote type changed to downvote
  TestValidator.equals(
    "vote type changed to downvote",
    updatedVote.vote_type,
    "downvote",
  );
  // 7. Verify targetComment is set for comment vote
  TestValidator.equals(
    "targetComment is set for comment vote",
    updatedVote.targetComment !== null,
    true,
  );
  // 8. Verify targetComment id matches the comment
  TestValidator.equals(
    "targetComment id matches",
    updatedVote.targetComment?.id,
    comment.id,
  );
  // 9. Verify targetPost is null for comment vote
  TestValidator.equals(
    "targetPost is null for comment vote",
    updatedVote.targetPost,
    null,
  );
  // 10. Verify vote direction actually changed
  TestValidator.notEquals(
    "vote changed direction from upvote to downvote",
    upvoteResult.vote_type,
    updatedVote.vote_type,
  );
}
