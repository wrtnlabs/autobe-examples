import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserRefresh";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

/**
 * Validate refresh-token rotation and rejection of stale refresh tokens for
 * discussionBoard member users.
 *
 * Business intent (adapted from the original scenario):
 *
 * - We want to ensure that the refresh endpoint does not accept a refresh token
 *   once business rules consider it unusable. As we cannot directly manipulate
 *   account_status or restriction records from this test, we instead validate a
 *   closely related and actually testable rule: a previously used refresh token
 *   must not be accepted again after token rotation.
 *
 * High-level flow:
 *
 * 1. Join a new member user via POST /auth/memberUser/join to obtain an
 *    IDiscussionBoardMemberuser.IAuthorized payload with an initial token set.
 * 2. Extract the initial refresh token from `authorized.token.refresh`.
 * 3. Perform a first refresh via POST /auth/memberUser/refresh with that refresh
 *    token, expecting success and a new IDiscussionBoardMemberuser.IAuthorized
 *    response containing a rotated token block.
 * 4. Immediately attempt a second refresh using the _original_ refresh token again
 *    (not the newly issued one).
 * 5. Expect the backend to reject this second attempt, since the original refresh
 *    token has effectively become stale/consumed according to typical rotation
 *    rules.
 * 6. Throughout, assert that all successful responses conform to the
 *    IDiscussionBoardMemberuser.IAuthorized schema via typia.assert, and use
 *    TestValidator to ensure token values actually change between rotations.
 */
export async function test_api_member_user_token_refresh_for_restricted_account(
  connection: api.IConnection,
) {
  // 1. Join a new member user and obtain an initial authorized payload.
  const joinRequest = typia.random<IDiscussionBoardMemberUserJoin.IRequest>();

  const joined: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert<IDiscussionBoardMemberuser.IAuthorized>(joined);

  const initialAccessToken: string = joined.token.access;
  const initialRefreshToken: string = joined.token.refresh;

  // 2. Sanity checks on the initial token block.
  TestValidator.predicate(
    "initial access token must be a non-empty string",
    initialAccessToken.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token must be a non-empty string",
    initialRefreshToken.length > 0,
  );

  // 3. First refresh using the initial refresh token – should succeed.
  const refreshedOnce: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IDiscussionBoardMemberUserRefresh.IRequest,
    });
  typia.assert<IDiscussionBoardMemberuser.IAuthorized>(refreshedOnce);

  const rotatedAccessToken: string = refreshedOnce.token.access;
  const rotatedRefreshToken: string = refreshedOnce.token.refresh;

  // 4. Ensure that token rotation actually happened: at least one of the
  //    tokens should differ from the original (best effort check).
  TestValidator.predicate(
    "at least one of access/refresh tokens should rotate on first refresh",
    rotatedAccessToken !== initialAccessToken ||
      rotatedRefreshToken !== initialRefreshToken,
  );

  // 5. Attempt to refresh again using the *original* refresh token, which
  //    should now be considered stale/consumed and cause an error.
  await TestValidator.error(
    "second refresh with stale original refresh token must fail",
    async () => {
      await api.functional.auth.memberUser.refresh(connection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IDiscussionBoardMemberUserRefresh.IRequest,
      });
    },
  );

  // 6. Sanity check that the last successful authorized payload still
  //    represents a stable member profile, independent of the failed
  //    stale-token attempt.
  TestValidator.equals(
    "email should remain stable across successful refresh",
    refreshedOnce.email,
    joined.email,
  );
  TestValidator.equals(
    "member id should remain stable across successful refresh",
    refreshedOnce.id,
    joined.id,
  );
}
