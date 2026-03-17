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
 * Test comment vote removal functionality with karma score verification.
 *
 * This test validates the complete vote lifecycle on comments:
 * 1. Community and member setup
 * 2. Post and comment creation
 * 3. Upvote casting and karma verification
 * 4. Vote removal and karma restoration
 * 5. Downvote casting and karma verification
 * 6. Vote removal and final karma restoration
 */
export async function test_api_comment_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community
  const adminConnection: api.IConnection = { host: connection.host };
  const community = await generate_random_reddit_clone_communities_create(
    adminConnection,
    {},
  );
  // 2. Register author member and store credentials
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorPassword = RandomGenerator.alphaNumeric(16);
  const authorUsername = RandomGenerator.name(1);
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: authorEmail,
      password: authorPassword,
      username: authorUsername,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const authorInitialKarma = authorAuth.karma_score.score;
  // 3. Author subscribes to community
  await generate_random_reddit_clone_member_subscriptions_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 4. Author creates a text post
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
      },
    },
  );
  // 5. Author creates a comment on their post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      authorConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  // 6. Register voter member
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Voter subscribes to community
  await generate_random_reddit_clone_member_subscriptions_create(
    voterConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 7. Voter casts an UPVOTE on the comment
  const upvote = await api.functional.redditClone.member.comments.votes.vote(
    voterConnection,
    {
      commentId: comment.id,
      body: {
        vote_type: "UPVOTE",
      },
    },
  );
  typia.assert(upvote);
  // 8. Verify author's karma increased by 1
  TestValidator.equals(
    "author karma after upvote",
    upvote.member.karma_score,
    authorInitialKarma + 1,
  );
  // 9. Voter removes their vote by submitting vote_type: null
  const removedUpvote =
    await api.functional.redditClone.member.comments.votes.vote(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: null,
        },
      },
    );
  typia.assert(removedUpvote);
  // 10. Verify the vote record is soft-deleted
  TestValidator.predicate(
    "vote is soft-deleted after removal",
    removedUpvote.deleted_at !== null,
  );
  // 11. Verify author's karma decreased by 1 (returned to original value)
  TestValidator.equals(
    "author karma after upvote removal",
    removedUpvote.member.karma_score,
    authorInitialKarma,
  );
  // 12. Voter casts a DOWNVOTE on the same comment
  const downvote = await api.functional.redditClone.member.comments.votes.vote(
    voterConnection,
    {
      commentId: comment.id,
      body: {
        vote_type: "DOWNVOTE",
      },
    },
  );
  typia.assert(downvote);
  // 13. Verify author's karma decreased by 1
  TestValidator.equals(
    "author karma after downvote",
    downvote.member.karma_score,
    authorInitialKarma - 1,
  );
  // 14. Voter removes the downvote by submitting vote_type: null
  const removedDownvote =
    await api.functional.redditClone.member.comments.votes.vote(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: null,
        },
      },
    );
  typia.assert(removedDownvote);
  // 15. Verify author's karma returned to original value
  TestValidator.equals(
    "author karma after downvote removal",
    removedDownvote.member.karma_score,
    authorInitialKarma,
  );
}
