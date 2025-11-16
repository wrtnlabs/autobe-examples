import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import type { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";

/**
 * Validate retrieval and audit semantics of a guest user session detail.
 *
 * Business goal: Ensure that a guest user session created by the
 * unauthenticated join flow can be retrieved via the todoApp guestUser session
 * detail endpoint and that the returned telemetry/timestamp fields are
 * consistent with the session summary returned at join time. This focuses on
 * audit semantics and read‑only access to session telemetry.
 *
 * Scenario (adapted to available APIs):
 *
 * 1. Call POST /auth/guestUser/join to create a guest identity and session.
 *
 *    - Build ITodoAppGuestUserJoin.IRequest with realistic href/referrer URIs,
 *         leaving other fields optional.
 *    - Receive ITodoAppGuestUser.IAuthorized containing token, guest summary, and
 *         session summary.
 * 2. Call GET /todoApp/guestUser/guestUsers/{guestUserId}/sessions/{sessionId}
 *    using guest.id and session.id from the join response.
 * 3. Validate that the detail response:
 *
 *    - Conforms to ITodoAppGuestUserSession via typia.assert.
 *    - Has id equal to the session summary id.
 *    - Has ip, href, and referrer equal to those in the session summary.
 *    - Has created_at equal to the session summary created_at.
 *    - Has expired_at equal to the session summary expired_at (typically null for a
 *         new session), demonstrating lifecycle consistency.
 * 4. Call the detail endpoint a second time for the same identifiers and verify
 *    that the two detail responses are identical, confirming read‑only behavior
 *    and stable audit records.
 */
export async function test_api_guestuser_session_detail_after_expiry(
  connection: api.IConnection,
) {
  // 1. Create a guest user and initial session via join
  const joinBody = {
    // optional external_reference and display_name omitted for simplicity
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppGuestUserJoin.IRequest;

  const authorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(authorized);

  const guestUserId = authorized.guest.id;
  const sessionSummary = authorized.session;

  // 2. Retrieve detailed session
  const detail: ITodoAppGuestUserSession =
    await api.functional.todoApp.guestUser.guestUsers.sessions.at(connection, {
      guestUserId,
      sessionId: sessionSummary.id,
    });
  typia.assert<ITodoAppGuestUserSession>(detail);

  // 3. Validate ID and telemetry consistency between summary and detail
  TestValidator.equals(
    "session detail id matches session summary id",
    detail.id,
    sessionSummary.id,
  );
  TestValidator.equals(
    "session detail ip matches session summary ip",
    detail.ip,
    sessionSummary.ip,
  );
  TestValidator.equals(
    "session detail href matches session summary href",
    detail.href,
    sessionSummary.href,
  );
  TestValidator.equals(
    "session detail referrer matches session summary referrer",
    detail.referrer,
    sessionSummary.referrer,
  );
  TestValidator.equals(
    "session detail created_at matches session summary created_at",
    detail.created_at,
    sessionSummary.created_at,
  );
  TestValidator.equals(
    "session detail expired_at matches session summary expired_at",
    detail.expired_at ?? null,
    sessionSummary.expired_at ?? null,
  );

  // 4. Re-fetch the detail to confirm read-only behavior (no mutation on read)
  const detailAgain: ITodoAppGuestUserSession =
    await api.functional.todoApp.guestUser.guestUsers.sessions.at(connection, {
      guestUserId,
      sessionId: sessionSummary.id,
    });
  typia.assert<ITodoAppGuestUserSession>(detailAgain);

  TestValidator.equals(
    "session detail is stable across repeated reads",
    detailAgain,
    detail,
  );
}
