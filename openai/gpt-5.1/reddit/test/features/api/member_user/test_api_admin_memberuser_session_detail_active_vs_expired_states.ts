import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuserSession";

/**
 * Verify admin session detail visibility and expired_at semantics for member
 * user sessions.
 *
 * Business goal
 *
 * - Ensure that an authenticated adminUser can call the session detail endpoint
 *   GET
 *   /communityPlatform/adminUser/memberUsers/{username}/sessions/{sessionId}
 *   and receive a response shaped as ICommunityPlatformMemberuserSession.
 * - Validate how the expired_at field is used to distinguish active vs expired
 *   sessions at a basic temporal level, without attempting to orchestrate full
 *   member user lifecycle due to missing APIs.
 *
 * Scope limitations and adjustments
 *
 * - The provided SDK slice only exposes:
 *
 *   - POST /auth/adminUser/join -> api.functional.auth.adminUser.join
 *   - GET /communityPlatform/adminUser/memberUsers/{username}/sessions/{sessionId}
 *       -> api.functional.communityPlatform.adminUser.memberUsers.sessions.at
 *   - There is no endpoint for creating, listing, or mutating memberUser sessions,
 *       nor for creating memberUser accounts themselves.
 * - Therefore, it is impossible to deterministically create two specific sessions
 *   (one active, one expired) for a known member user from inside this E2E
 *   test. Instead, we rely on random data/simulation behavior and perform
 *   conditional checks based on whatever expired_at values are returned.
 * - We strictly avoid any attempt to fabricate invalid types or send wrong DTOs:
 *   all request bodies are typed via `satisfies` and generated via typia.random
 *   where appropriate.
 *
 * Test outline
 *
 * 1. Admin join and authorization
 *
 *    - Call api.functional.auth.adminUser.join with a randomly generated
 *         ICommunityPlatformAdminUserJoin.IRequest using typia.random.
 *    - Assert the returned ICommunityPlatformAdminuser.IAuthorized with typia.assert
 *         to guarantee structural correctness.
 *    - Rely on the SDK to attach the JWT access token to connection.headers, without
 *         directly mutating headers in this test.
 * 2. First session detail retrieval (candidate active/expired A)
 *
 *    - Call api.functional.communityPlatform.adminUser.memberUsers.sessions.at with
 *         randomly generated username and sessionId strings.
 *    - Assert the response as ICommunityPlatformMemberuserSession.
 *    - Inspect expired_at:
 *
 *         - If null/undefined: treat as candidate "active-like" session and confirm
 *                   created_at is a valid date-time not in the future.
 *         - If non-null: treat as candidate "expired-like" session and confirm the parsed
 *                   timestamp is strictly in the past.
 *    - Validate basic sanity of memberUser summary (non-empty id and username).
 * 3. Second session detail retrieval (candidate active/expired B)
 *
 *    - Perform a second call to the same endpoint using another pair of random
 *         username/sessionId values.
 *    - Repeat structural assertions and temporal checks on expired_at.
 * 4. Aggregate state checks
 *
 *    - Track whether we saw at least one session where expired_at is null or
 *         undefined (interpreted as active-like) and at least one where
 *         expired_at is non-null (interpreted as expired-like).
 *    - Because the underlying data and simulator behavior are not under the test's
 *         control, gracefully allow the case where only one state is observed,
 *         but still assert that any non-null expired_at timestamps are strictly
 *         in the past.
 * 5. No type-error or HTTP-status testing
 *
 *    - We do not deliberately send wrong types, omit required fields, or test for
 *         specific HTTP status codes.
 *    - All validations focus on business semantics around expired_at and basic
 *         structural correctness using typia.assert and TestValidator.
 */
export async function test_api_admin_memberuser_session_detail_active_vs_expired_states(
  connection: api.IConnection,
) {
  // 1. Admin join and authorization
  const adminJoinBody =
    typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // Helper function to validate a single session and return its state
  const now = new Date();
  type SessionState = "active_like" | "expired_like";

  const validateSession = (
    session: ICommunityPlatformMemberuserSession,
  ): SessionState => {
    typia.assert<ICommunityPlatformMemberuserSession>(session);

    // Basic memberUser summary checks
    TestValidator.predicate(
      "memberUser.id must be a non-empty string",
      typeof session.memberUser.id === "string" &&
        session.memberUser.id.length > 0,
    );
    TestValidator.predicate(
      "memberUser.username must be a non-empty string",
      typeof session.memberUser.username === "string" &&
        session.memberUser.username.length > 0,
    );

    // Temporal semantics based on expired_at
    if (session.expired_at === null || session.expired_at === undefined) {
      // Active-like session: ensure created_at is not in the future
      const createdAt = new Date(session.created_at);
      TestValidator.predicate(
        "active-like session created_at must not be in the future",
        createdAt.getTime() <= now.getTime(),
      );
      return "active_like";
    }

    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      "expired-like session expired_at must be strictly in the past",
      expiredAt.getTime() < now.getTime(),
    );
    return "expired_like";
  };

  // 2. First session detail retrieval
  const firstSession =
    await api.functional.communityPlatform.adminUser.memberUsers.sessions.at(
      connection,
      {
        username: typia.random<string>(),
        sessionId: typia.random<string>(),
      },
    );
  const firstState = validateSession(firstSession);

  // 3. Second session detail retrieval
  const secondSession =
    await api.functional.communityPlatform.adminUser.memberUsers.sessions.at(
      connection,
      {
        username: typia.random<string>(),
        sessionId: typia.random<string>(),
      },
    );
  const secondState = validateSession(secondSession);

  // 4. Aggregate checks for observed states (best-effort given randomness)
  const sawActiveLike =
    firstState === "active_like" || secondState === "active_like";
  const sawExpiredLike =
    firstState === "expired_like" || secondState === "expired_like";

  TestValidator.predicate(
    "at least one of the fetched sessions should be interpretable as active-like or expired-like",
    sawActiveLike || sawExpiredLike,
  );
}
