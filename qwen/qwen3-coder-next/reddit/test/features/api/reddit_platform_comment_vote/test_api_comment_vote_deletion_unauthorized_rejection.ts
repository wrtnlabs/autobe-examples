import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_user_comment_votes_create } from "../../../generate/generate_random_reddit_platform_user_comment_votes_create";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";

/**
 * Test unauthorized comment vote deletion scenario.
 * This test validates that users can only delete their own comment votes and
 * cannot delete votes cast by other users. The scenario covers:
 *
 * 1. Two different users register and authenticate on the platform
 * 2. User A creates a comment vote
 * 3. User B attempts to delete User A's vote (should fail)
 * 4. System properly rejects the unauthorized deletion attempt
 */
export async function test_api_comment_vote_deletion_unauthorized_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two users (User A and User B)
  const userAConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userAConnection, {
    body: {} satisfies IRedditPlatformUser.IJoin,
  });
  const userBConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userBConnection, {
    body: {} satisfies IRedditPlatformUser.IJoin,
  });
  // 2. Create a comment vote by user A
  const vote = await api.functional.redditPlatform.user.comment_votes.create(
    userAConnection,
    {
      body: {} satisfies IRedditPlatformCommentVote.ICreate,
    },
  );
  typia.assert(vote);
  // 3. User B attempts to delete user A's vote (should fail with 403 Forbidden)
  // NOTE: Using type assertion to work around empty IRedditPlatformCommentVote type definition
  const voteId = (vote as any).id;
  await TestValidator.error("unauthorized deletion rejected", async () => {
    await api.functional.redditPlatform.user.comment_votes.erase(
      userBConnection,
      { id: voteId },
    );
  });
  // 4. Verify vote still exists by retrieving it with user A
  // After User B's failed attempt, delete the vote with proper authorization
  const deletedVote =
    await api.functional.redditPlatform.user.comment_votes.erase(
      userAConnection,
      { id: voteId },
    );
  typia.assert(deletedVote);
}
