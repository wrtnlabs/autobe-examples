import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Verify that deleting a non-existent post vote as an authenticated member user
 * results in an error and does not corrupt authentication or test flow.
 *
 * Business intent:
 *
 * - A member user attempts to delete a post vote ID that does not exist in
 *   `community_platform_post_votes`.
 * - The platform must not treat this as a successful deletion and should respond
 *   with an error (not-found style HTTP error).
 * - The failed deletion must not create votes or break the authentication
 *   context; subsequent calls using the same connection must still behave
 *   consistently.
 *
 * Steps:
 *
 * 1. Join as a new member user via POST /auth/memberUser/join, obtaining an
 *    authorization context on the connection.
 * 2. Generate a random postVoteId string that is extremely unlikely to correspond
 *    to any real vote.
 * 3. Call DELETE /communityPlatform/memberUser/postVotes/{postVoteId} with this
 *    random ID and assert that an error is thrown.
 * 4. Repeat the delete call with the same non-existent ID to confirm that the
 *    failure does not corrupt authentication or change the behavior of the
 *    endpoint.
 */
export async function test_api_post_vote_delete_nonexistent_vote_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new member user so that subsequent erase calls are
  //    authenticated as a member user.
  const joinBody = typia.random<ICommunityPlatformMemberuser.IJoinRequest>();

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Generate a random post vote ID that is extremely unlikely to
  //    correspond to an existing vote record.
  const nonexistentPostVoteId: string = typia.random<string>();

  // 3. Attempt to delete the non-existent vote and verify that an error
  //    is thrown rather than treating the operation as successful. We do
  //    not assert specific HTTP status codes, only that an error occurs.
  await TestValidator.error(
    "deleting non-existent post vote must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.postVotes.erase(
        connection,
        {
          postVoteId: nonexistentPostVoteId,
        },
      );
    },
  );

  // 4. Attempt the same deletion again to ensure that the prior failure
  //    did not corrupt authentication state or otherwise change behavior.
  //    The second attempt should also fail in the same manner.
  await TestValidator.error(
    "repeated delete of same non-existent post vote must also fail",
    async () => {
      await api.functional.communityPlatform.memberUser.postVotes.erase(
        connection,
        {
          postVoteId: nonexistentPostVoteId,
        },
      );
    },
  );
}
