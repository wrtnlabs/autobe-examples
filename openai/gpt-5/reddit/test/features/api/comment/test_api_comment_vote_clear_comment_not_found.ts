import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

/**
 * Clear vote on a non-existent comment should raise an error (business logic).
 *
 * Business context:
 *
 * - The DELETE /communityPlatform/memberUser/comments/{commentId}/vote endpoint
 *   clears the authenticated member's vote on the target comment.
 * - If the target comment does not exist, the operation must fail.
 *
 * Test workflow:
 *
 * 1. Authenticate a member user by joining (POST /auth/memberUser/join).
 * 2. Generate a random UUID to represent a non-existent commentId.
 * 3. Attempt to clear the vote with DELETE
 *    /communityPlatform/memberUser/comments/{commentId}/vote.
 * 4. Validate that an error is raised for the unknown comment (no HTTP status code
 *    assertion).
 */
export async function test_api_comment_vote_clear_comment_not_found(
  connection: api.IConnection,
) {
  // 1) Authenticate a member user via join
  const now: string = new Date().toISOString();
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(12),
    password: `A1${RandomGenerator.alphaNumeric(10)}`,
    terms_accepted_at: now,
    privacy_accepted_at: now,
    marketing_opt_in: Math.random() < 0.5,
  } satisfies ICommunityPlatformMemberUser.ICreate;

  const authorized: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2) Prepare a non-existent comment UUID
  const unknownCommentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3) Attempt to clear vote on the non-existent comment → must error
  await TestValidator.error(
    "clearing vote on non-existent comment should raise an error",
    async () => {
      await api.functional.communityPlatform.memberUser.comments.vote.erase(
        connection,
        { commentId: unknownCommentId },
      );
    },
  );
}
