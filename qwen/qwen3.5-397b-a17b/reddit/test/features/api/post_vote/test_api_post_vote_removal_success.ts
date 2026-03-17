import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_votes_vote } from "../../../generate/generate_random_reddit_clone_member_posts_votes_vote";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test the vote removal scenario where a member removes their existing vote from a post.
 *
 * This test validates:
 * 1. Vote casting (UPVOTE) increases post score
 * 2. Vote removal (vote_type=null) soft-deletes the vote
 * 3. Post score decreases when vote is removed
 * 4. Removing non-existent vote is idempotent (returns success)
 */
export async function test_api_post_vote_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_member_join(adminConnection, {
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
  typia.assert(adminAuth);
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
  // 2. Register voter member
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
  const voterId = voterAuth.id;
  // 3. Subscribe voter to community
  await generate_random_reddit_clone_member_subscriptions_create(
    voterConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 4. Register post author member
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
  // 5. Subscribe author to community
  await generate_random_reddit_clone_member_subscriptions_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 6. Create text post as author
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
  const postId = post.id;
  // 7. Cast UPVOTE as voter
  const upvoteResult =
    await generate_random_reddit_clone_member_posts_votes_vote(
      voterConnection,
      {
        params: { postId },
        body: {
          vote_type: "UPVOTE",
        },
      },
    );
  typia.assert(upvoteResult);
  // 8. Validate initial vote
  TestValidator.equals("vote_type is UPVOTE", upvoteResult.vote_type, "UPVOTE");
  TestValidator.equals(
    "post_vote_score is 1 after upvote",
    upvoteResult.post_vote_score,
    1,
  );
  TestValidator.predicate(
    "vote not deleted initially",
    upvoteResult.deleted_at === null,
  );
  TestValidator.equals(
    "vote member matches voter",
    upvoteResult.member.id,
    voterId,
  );
  // 9. Remove vote by setting vote_type to null
  const removeVoteResult =
    await generate_random_reddit_clone_member_posts_votes_vote(
      voterConnection,
      {
        params: { postId },
        body: {
          vote_type: null,
        },
      },
    );
  typia.assert(removeVoteResult);
  // 10. Validate soft delete
  TestValidator.predicate(
    "deleted_at is set after vote removal",
    removeVoteResult.deleted_at !== null,
  );
  // 11. Validate post score decreased to 0
  TestValidator.equals(
    "post_vote_score is 0 after vote removal",
    removeVoteResult.post_vote_score,
    0,
  );
  // 12. Test idempotent removal (removing vote when none exists)
  const idempotentResult =
    await generate_random_reddit_clone_member_posts_votes_vote(
      voterConnection,
      {
        params: { postId },
        body: {
          vote_type: null,
        },
      },
    );
  typia.assert(idempotentResult);
  TestValidator.equals(
    "idempotent removal returns score 0",
    idempotentResult.post_vote_score,
    0,
  );
  TestValidator.predicate(
    "idempotent removal has deleted_at set",
    idempotentResult.deleted_at !== null,
  );
}
