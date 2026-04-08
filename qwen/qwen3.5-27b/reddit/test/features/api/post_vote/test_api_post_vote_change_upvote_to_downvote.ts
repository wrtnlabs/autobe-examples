import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_votes_create } from "../../../generate/generate_random_reddit_clone_member_posts_votes_create";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_vote } from "../../../prepare/prepare_random_reddit_clone_post_vote";

/**
 * Test that a member can change their existing vote from upvote to downvote on the same post.
 *
 * Validates the complete vote modification flow including member authentication, post creation, initial upvote casting, and vote type change from upvote to downvote. Ensures that the post's vote score correctly decreases by 2 points (from +1 to -1) when the vote is changed, and that the vote entity's metadata (updated_at timestamp) is properly updated while deleted_at remains null.
 *
 * Special attention is given to verifying the business logic where changing a vote from upvote to downvote results in a -2 score impact (removing +1 and adding -1), and that the vote record is updated rather than deleted and recreated.
 *
 * 1. Member authenticates via join to obtain access tokens.
 * 2. Member creates a post in a community (requires subscription).
 * 3. Member casts an initial upvote on the post.
 * 4. Member changes their vote from upvote to downvote.
 * 5. Validates that the post's vote score decreased by 2 (from +1 to -1).
 * 6. Validates that the vote entity's updated_at timestamp reflects the change.
 * 7. Validates that deleted_at remains null (vote was updated, not removed).
 */
export async function test_api_post_vote_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create a post (requires community subscription, handled internally by utility)
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(post);
  // 3. Cast initial upvote
  const upvote = await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: { vote_type: "upvote" },
    },
  );
  typia.assert(upvote);
  // Verify initial upvote state
  TestValidator.equals(
    "initial vote type is upvote",
    upvote.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "initial post vote score is 1",
    upvote.post.vote_score,
    1,
  );
  TestValidator.predicate(
    "initial vote has created_at",
    upvote.created_at !== null,
  );
  TestValidator.predicate(
    "initial vote has updated_at",
    upvote.updated_at !== null,
  );
  TestValidator.equals(
    "initial vote deleted_at is null",
    upvote.deleted_at,
    null,
  );
  // 4. Change vote from upvote to downvote
  const downvote = await generate_random_reddit_clone_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: post.id },
      body: { vote_type: "downvote" },
    },
  );
  typia.assert(downvote);
  // 5. Validate vote score decreased by 2 (from +1 to -1)
  TestValidator.equals(
    "vote type changed to downvote",
    downvote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "post vote score decreased to -1",
    downvote.post.vote_score,
    -1,
  );
  // 6. Validate updated_at timestamp reflects the change
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    new Date(downvote.updated_at).getTime() >=
      new Date(downvote.created_at).getTime(),
  );
  // 7. Validate deleted_at remains null (vote was updated, not removed)
  TestValidator.equals(
    "vote deleted_at remains null",
    downvote.deleted_at,
    null,
  );
  // Additional validation: vote ID should be the same (update, not recreate)
  TestValidator.equals("vote ID remains the same", upvote.id, downvote.id);
}
