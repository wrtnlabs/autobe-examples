import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_comments_votes_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_votes_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_comment_vote_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the successful retrieval of a comment vote record.
   *
   * Validates the complete comment vote workflow including member registration,
   * community subscription, post creation, comment writing, vote casting,
   * and vote record retrieval. Ensures that the vote correctly references
   * the comment and that the author information matches the authenticated user.
   *
   * Special attention is given to verifying that the vote_type, author reference,
   * and timestamp fields are correctly maintained throughout the workflow.
   *
   * 1. Member registers with randomized email, password, and username.
   * 2. Member subscribes to a community to gain posting privileges.
   * 3. Member creates a text post in the subscribed community.
   * 4. Member writes a comment on the post.
   * 5. Member casts an upvote on the comment.
   * 6. Member retrieves the specific vote record by vote ID.
   * 7. Validates all vote entity fields including vote_type, author, timestamps,
   *    and relationship references to comment and post.
   */
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Subscribe to a community
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const subscription: IRedditCommunitySubscription =
    await api.functional.redditCommunity.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: communityId,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 3. Create a post in the community
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        reddit_community_community_id: communityId,
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);
  // 4. Write a comment on the post
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Cast an upvote on the comment
  const vote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.member.posts.comments.votes.create(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "upvote" as const,
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  typia.assert(vote);
  // 6. Retrieve the specific vote record (API returns IRedditCommunityPostVote)
  const retrievedVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.comments.votes.at(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        voteId: vote.id,
      },
    );
  typia.assert(retrievedVote);
  // 7. Validate the retrieved vote record
  TestValidator.equals("vote_id matches requested", retrievedVote.id, vote.id);
  TestValidator.equals(
    "vote_type is upvote",
    retrievedVote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "author matches authenticated member",
    retrievedVote.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "author username matches",
    retrievedVote.author.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "post_id matches comment's post",
    retrievedVote.post.id,
    post.id,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    !isNaN(Date.parse(retrievedVote.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    !isNaN(Date.parse(retrievedVote.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null (not soft-deleted)",
    retrievedVote.deleted_at,
    null,
  );
}
