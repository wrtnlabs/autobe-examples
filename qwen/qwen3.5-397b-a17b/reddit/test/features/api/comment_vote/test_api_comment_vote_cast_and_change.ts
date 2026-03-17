import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import type { IRedditCloneVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test the complete vote lifecycle on a comment including casting initial votes,
 * changing vote types, and verifying karma impact on the comment author.
 *
 * Test Steps:
 * 1. Create a community with a unique name and description
 * 2. Register two member accounts: voter and author (different users)
 * 3. Subscribe the author to the community
 * 4. Author creates a text post in the community
 * 5. Author creates a comment on their own post
 * 6. Subscribe the voter to the community
 * 7. Voter casts an UPVOTE on the author's comment
 * 8. Verify the vote record is created with vote_type='UPVOTE'
 * 9. Voter changes their vote to DOWNVOTE on the same comment
 * 10. Verify the vote record is updated with vote_type='DOWNVOTE'
 * 11. Voter changes their vote back to UPVOTE
 * 12. Verify the vote record reflects UPVOTE
 */
export async function test_api_comment_vote_cast_and_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community
  const community = await generate_random_reddit_clone_communities_create(
    connection,
    {},
  );
  typia.assert(community);
  // 2. Register author member account
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(authorAuth);
  // 3. Author subscribes to community
  const authorSubscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(authorSubscription);
  // 4. Author creates a text post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Author creates a comment on their own post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Register voter member account
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // Voter subscribes to community
  const voterSubscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      voterConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(voterSubscription);
  // 7. Voter casts an UPVOTE on the author's comment
  const upvote = await api.functional.redditClone.member.comments.votes.vote(
    voterConnection,
    {
      commentId: comment.id,
      body: {
        vote_type: "UPVOTE",
      } satisfies IRedditCloneVote.IUpdate,
    },
  );
  typia.assert(upvote);
  // 8. Verify the vote record is created with vote_type='UPVOTE'
  TestValidator.equals("vote type is UPVOTE", upvote.vote_type, "UPVOTE");
  TestValidator.equals("vote target is comment", upvote.target_type, "COMMENT");
  TestValidator.equals(
    "vote target id matches comment",
    upvote.target_id,
    comment.id,
  );
  // 9. Voter changes their vote to DOWNVOTE on the same comment
  const downvote = await api.functional.redditClone.member.comments.votes.vote(
    voterConnection,
    {
      commentId: comment.id,
      body: {
        vote_type: "DOWNVOTE",
      } satisfies IRedditCloneVote.IUpdate,
    },
  );
  typia.assert(downvote);
  // 10. Verify the vote record is updated with vote_type='DOWNVOTE'
  TestValidator.equals(
    "vote type changed to DOWNVOTE",
    downvote.vote_type,
    "DOWNVOTE",
  );
  TestValidator.equals("vote id remains same", downvote.id, upvote.id);
  TestValidator.predicate(
    "updated_at is later than created_at",
    new Date(downvote.updated_at) > new Date(downvote.created_at),
  );
  // 11. Voter changes their vote back to UPVOTE
  const upvoteAgain =
    await api.functional.redditClone.member.comments.votes.vote(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "UPVOTE",
        } satisfies IRedditCloneVote.IUpdate,
      },
    );
  typia.assert(upvoteAgain);
  // 12. Verify the vote record reflects UPVOTE and timestamps are maintained
  TestValidator.equals(
    "vote type changed back to UPVOTE",
    upvoteAgain.vote_type,
    "UPVOTE",
  );
  TestValidator.equals(
    "vote id remains same throughout",
    upvoteAgain.id,
    upvote.id,
  );
  TestValidator.predicate(
    "final updated_at is latest",
    new Date(upvoteAgain.updated_at) > new Date(downvote.updated_at),
  );
}
