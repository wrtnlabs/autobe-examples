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
 * Test vote modification where a member changes their existing upvote to a downvote on a comment.
 *
 * Test Flow:
 * 1. Create a community for the post and comment
 * 2. Register member A (voter) and get their connection
 * 3. Register member B (comment author) and get their connection
 * 4. Member A subscribes to the community
 * 5. Member B creates a post in the community
 * 6. Member B creates a comment on their post
 * 7. Member A casts initial UPVOTE on the comment
 * 8. Member A changes vote from UPVOTE to DOWNVOTE
 * 9. Validate vote record is updated (vote_type='DOWNVOTE', updated_at changed, same ID)
 */
export async function test_api_comment_vote_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  const community = await generate_random_reddit_clone_communities_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 2. Register member A (voter)
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(voterAuth);
  // 3. Register member B (comment author)
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(authorAuth);
  // 4. Member A subscribes to community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      voterConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 5. Member B creates a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
  );
  typia.assert(post);
  // 6. Member B creates a comment on their post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      authorConnection,
      {
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 7. Member A casts initial UPVOTE on the comment
  const initialVote =
    await api.functional.redditClone.member.comments.vote.putByCommentid(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "UPVOTE",
        } satisfies IRedditCloneVote.IVote,
      },
    );
  typia.assert(initialVote);
  // Validate initial vote
  TestValidator.equals("initial vote type", initialVote.vote_type, "UPVOTE");
  TestValidator.equals(
    "initial vote target",
    initialVote.target_id,
    comment.id,
  );
  TestValidator.equals(
    "initial vote target type",
    initialVote.target_type,
    "COMMENT",
  );
  // Store initial vote timestamps for comparison
  const initialVoteId = initialVote.id;
  const initialVoteUpdatedAt = initialVote.updated_at;
  // Wait a small amount to ensure updated_at will be different
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 8. Member A changes vote from UPVOTE to DOWNVOTE
  const updatedVote =
    await api.functional.redditClone.member.comments.vote.putByCommentid(
      voterConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "DOWNVOTE",
        } satisfies IRedditCloneVote.IVote,
      },
    );
  typia.assert(updatedVote);
  // 9. Validate vote record is updated (not recreated)
  TestValidator.equals("updated vote type", updatedVote.vote_type, "DOWNVOTE");
  TestValidator.equals(
    "vote record ID unchanged",
    updatedVote.id,
    initialVoteId,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedVote.updated_at,
    initialVoteUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at is later",
    updatedVote.updated_at > initialVoteUpdatedAt,
  );
  TestValidator.equals(
    "vote target unchanged",
    updatedVote.target_id,
    comment.id,
  );
  TestValidator.equals(
    "vote target type unchanged",
    updatedVote.target_type,
    "COMMENT",
  );
}
