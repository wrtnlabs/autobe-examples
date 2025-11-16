import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import type { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";

/**
 * Verify that a guest user can join with only the minimal required navigation
 * context (href and referrer) and that the backend still establishes a valid
 * guest identity, session, and token set.
 *
 * Business intent:
 *
 * - Clients should be able to create a guest session with as little friction as
 *   possible, providing only essential navigation context (landing URL and
 *   referrer).
 * - Optional identity hints like external_reference, display_name, and ip may be
 *   omitted while the server derives or fills in required persistence fields.
 *
 * What this test validates:
 *
 * 1. POST /auth/guestUser/join accepts a payload that only includes href and
 *    referrer and conforms to ITodoAppGuestUserJoin.IRequest.
 * 2. The response is a valid ITodoAppGuestUser.IAuthorized structure as enforced
 *    by typia.assert.
 * 3. The guest identity summary is created/reused with
 *
 *    - Non-null UUID id,
 *    - Non-empty status,
 *    - Valid created_at and updated_at timestamps,
 *    - External_reference and display_name remaining unset (null/undefined) when not
 *         provided in the request.
 * 4. The session summary is created with
 *
 *    - Non-null id,
 *    - Non-null ip string even though ip was omitted in the request (server-side
 *         derivation from connection metadata),
 *    - Href and referrer matching the request payload,
 *    - Non-null created_at timestamp,
 *    - Expired_at null/undefined to indicate an active session.
 * 5. The token structure contains non-empty access and refresh tokens and
 *    date-time strings for expired_at and refreshable_until.
 */
export async function test_api_guestuser_join_minimal_required_payload(
  connection: api.IConnection,
) {
  // 1. Prepare minimal guest join request: only href and referrer.
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const requestBody = {
    href,
    referrer,
  } satisfies ITodoAppGuestUserJoin.IRequest;

  // 2. Call the guestUser.join endpoint with minimal payload.
  const authorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: requestBody,
    });

  // 3. Strongly assert the entire response shape.
  typia.assert<ITodoAppGuestUser.IAuthorized>(authorized);

  const { token, guest, session } = authorized;

  // 4. Validate token structure (non-empty strings, timestamps present).
  TestValidator.predicate(
    "access token should be a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expired_at should be a non-empty string",
    typeof token.expired_at === "string" && token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token refreshable_until should be a non-empty string",
    typeof token.refreshable_until === "string" &&
      token.refreshable_until.length > 0,
  );

  // 5. Validate guest identity summary.
  TestValidator.predicate(
    "guest id should be a non-empty string",
    typeof guest.id === "string" && guest.id.length > 0,
  );
  TestValidator.predicate(
    "guest status should be a non-empty string",
    typeof guest.status === "string" && guest.status.length > 0,
  );
  TestValidator.predicate(
    "guest created_at should be a non-empty string",
    typeof guest.created_at === "string" && guest.created_at.length > 0,
  );
  TestValidator.predicate(
    "guest updated_at should be a non-empty string",
    typeof guest.updated_at === "string" && guest.updated_at.length > 0,
  );

  // Optional identity hints should remain unset when not provided.
  TestValidator.predicate(
    "guest external_reference should be null or undefined when omitted",
    guest.external_reference === null || guest.external_reference === undefined,
  );
  TestValidator.predicate(
    "guest display_name should be null or undefined when omitted",
    guest.display_name === null || guest.display_name === undefined,
  );

  // 6. Validate session summary.
  TestValidator.predicate(
    "session id should be a non-empty string",
    typeof session.id === "string" && session.id.length > 0,
  );

  // Server must derive a non-null ip even if request omitted it.
  TestValidator.predicate(
    "session ip should be a non-empty string even when request omitted ip",
    typeof session.ip === "string" && session.ip.length > 0,
  );

  // href and referrer should match the request payload.
  TestValidator.equals(
    "session href should match request href",
    session.href,
    href,
  );
  TestValidator.equals(
    "session referrer should match request referrer",
    session.referrer,
    referrer,
  );

  TestValidator.predicate(
    "session created_at should be a non-empty string",
    typeof session.created_at === "string" && session.created_at.length > 0,
  );

  // For a fresh session, expired_at should be null or undefined.
  TestValidator.predicate(
    "session expired_at should be null or undefined for a newly created session",
    session.expired_at === null || session.expired_at === undefined,
  );
}
