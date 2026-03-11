import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_vote_create } from "../../../generate/generate_random_reddit_platform_member_comments_vote_create";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";

export async function test_api_comment_vote_change_preference(
  connection: api.IConnection,
): Promise<void> {
  // Create member who will cast votes
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(voterAuth);
  // Since we cannot create comments with available SDK, we'll test the vote change
  // by creating an initial vote, then changing it, and verifying the vote record update
  // The API should handle the atomic update internally
  // Note: This test assumes a comment exists. In production, you'd need to:
  // 1. Create a post in a community
  // 2. Create a comment on that post
  // 3. Then test vote changes on that comment
  // For this test, we'll use a mock commentId and verify the API behavior
  // by checking the vote record updates correctly
  // Create a comment ID for testing (in real scenario, this comes from comment creation)
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Step 1: Cast initial UPVOTE
  const initialVote =
    await api.functional.redditPlatform.member.comments.vote.create(
      voterConnection,
      {
        commentId,
        body: {
          vote_type: "UPVOTE",
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(initialVote);
  // Verify initial vote state
  TestValidator.equals("initial vote type", initialVote.vote_type, "UPVOTE");
  TestValidator.predicate(
    "initial comment score is 1",
    initialVote.comment.vote_score === 1,
  );
  // Store initial timestamps and scores for comparison
  const initialCreatedAt = initialVote.created_at;
  const initialUpdatedAt = initialVote.updated_at;
  const initialScore = initialVote.comment.vote_score;
  const initialAuthorKarma = initialVote.comment.author.karma_score;
  // Step 2: Change vote to DOWNVOTE
  const changedVote =
    await api.functional.redditPlatform.member.comments.vote.create(
      voterConnection,
      {
        commentId,
        body: {
          vote_type: "DOWNVOTE",
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(changedVote);
  // Verify vote type changed
  TestValidator.equals("changed vote type", changedVote.vote_type, "DOWNVOTE");
  TestValidator.equals(
    "final comment score is -1",
    changedVote.comment.vote_score,
    -1,
  );
  // Verify vote record was updated (not new record created)
  TestValidator.equals(
    "vote created_at unchanged (record updated)",
    changedVote.created_at,
    initialCreatedAt,
  );
  TestValidator.notEquals(
    "vote updated_at changed (record modified)",
    changedVote.updated_at,
    initialUpdatedAt,
  );
  // Verify score changed by 2 (from +1 to -1)
  TestValidator.equals(
    "score decreased by 2",
    changedVote.comment.vote_score,
    initialScore - 2,
  );
  // Verify no duplicate vote records (same comment_id, user_id combination)
  // This would be verified at database level, but we can check the response structure
  TestValidator.predicate(
    "vote record exists and updated",
    changedVote.id === initialVote.id,
  );
}