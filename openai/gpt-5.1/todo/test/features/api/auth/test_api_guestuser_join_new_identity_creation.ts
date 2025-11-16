import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import type { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";

/**
 * Validate creation of a new guestUser identity and linked session via POST
 * /auth/guestUser/join.
 *
 * ## Business intent
 *
 * This e2e test exercises the anonymous guest bootstrap flow. A visitor without
 * any prior identity context calls the guest join endpoint with basic request
 * metadata (landing page URL, referrer, and IP) and an optional display name.
 * The backend must:
 *
 * - Create (or select) a guest identity row in todo_app_guestusers
 * - Create a guest session row in todo_app_guestuser_sessions
 * - Issue a pair of JWT tokens wrapped in ITodoAppGuestUser.IAuthorized
 *
 * The scenario here focuses on the "new identity" path by omitting the
 * external_reference from ITodoAppGuestUserJoin.IRequest. This ensures the
 * backend is free to allocate a fresh guest identity and corresponding session
 * using the provided navigation context.
 *
 * ## Validation strategy
 *
 * 1. Construct a ITodoAppGuestUserJoin.IRequest payload with:
 *
 *    - Href: valid URI (landing page)
 *    - Referrer: valid URI (referrer page)
 *    - Ip: plausible IP string
 *    - Display_name: friendly label
 *    - External_reference: intentionally omitted
 * 2. Call api.functional.auth.guestUser.join with this payload.
 * 3. Use typia.assert to fully validate that the response matches
 *    ITodoAppGuestUser.IAuthorized.
 * 4. Perform additional business-level assertions using TestValidator:
 *
 *    - Token.access and token.refresh are non-empty strings.
 *    - Guest.id is non-empty and consistent with the session.guestUser.id.
 *    - Guest.status is a non-empty string.
 *    - Guest.created_at and guest.updated_at are non-empty (format already validated
 *         by typia).
 *    - Session.id is non-empty.
 *    - Session.guestUser.id === guest.id.
 *    - Session.ip, href, and referrer mirror the request payload values since we are
 *         explicitly providing them.
 *    - Session.created_at is non-empty.
 *    - Session.expired_at is either null or undefined (not yet expired).
 * 5. Rely on the SDK behavior that sets connection.headers.Authorization from
 *    token.access as a side-effect. We do not inspect headers directly
 *    (forbidden) and we do not have any other guest-protected endpoints
 *    available in this local API surface, so we limit token validation to
 *    structural checks.
 */
export async function test_api_guestuser_join_new_identity_creation(
  connection: api.IConnection,
) {
  // 1. Build a realistic ITodoAppGuestUserJoin.IRequest payload
  const href: string & tags.Format<"uri"> =
    "https://example.com/todos?source=guest-bootstrap";
  const referrer: string & tags.Format<"uri"> =
    "https://referrer.example.com/landing";
  const ip: string = "203.0.113.42";

  const requestBody = {
    href,
    referrer,
    // Provide an explicit IP even though the server could infer it
    ip,
    display_name: RandomGenerator.name(2),
    // external_reference intentionally omitted to model "new" guest identity
  } satisfies ITodoAppGuestUserJoin.IRequest;

  // 2. Call the guestUser join endpoint
  const authorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: requestBody,
    });

  // 3. Structural type validation
  typia.assert<ITodoAppGuestUser.IAuthorized>(authorized);

  const token: IAuthorizationToken = authorized.token;
  const guest: ITodoAppGuestUser.ISummary = authorized.guest;
  const session: ITodoAppGuestUserSession.ISummary = authorized.session;

  // 4. Business-level assertions
  // 4-1. Token basics
  TestValidator.predicate(
    "guestUser join: access token must be non-empty",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "guestUser join: refresh token must be non-empty",
    token.refresh.length > 0,
  );

  // 4-2. Guest identity fields
  TestValidator.predicate(
    "guestUser join: guest.id must be non-empty",
    guest.id.length > 0,
  );
  TestValidator.predicate(
    "guestUser join: guest.status must be non-empty",
    guest.status.length > 0,
  );
  TestValidator.predicate(
    "guestUser join: guest.created_at must be non-empty",
    guest.created_at.length > 0,
  );
  TestValidator.predicate(
    "guestUser join: guest.updated_at must be non-empty",
    guest.updated_at.length > 0,
  );

  // 4-3. Session fields and relationship to guest
  TestValidator.predicate(
    "guestUser join: session.id must be non-empty",
    session.id.length > 0,
  );

  TestValidator.equals(
    "guestUser join: session.guestUser.id must match guest.id",
    session.guestUser.id,
    guest.id,
  );

  TestValidator.equals(
    "guestUser join: session.ip should mirror the request ip",
    session.ip,
    ip,
  );
  TestValidator.equals(
    "guestUser join: session.href should mirror the request href",
    session.href,
    href,
  );
  TestValidator.equals(
    "guestUser join: session.referrer should mirror the request referrer",
    session.referrer,
    referrer,
  );

  TestValidator.predicate(
    "guestUser join: session.created_at must be non-empty",
    session.created_at.length > 0,
  );

  // expired_at is nullable; for a fresh session it should be null or undefined
  TestValidator.predicate(
    "guestUser join: new session should not be expired",
    session.expired_at === null || session.expired_at === undefined,
  );

  // 5. Consistency sanity checks (re-reading from the same object)
  TestValidator.equals(
    "guestUser join: guest.id remains stable across references",
    authorized.guest.id,
    guest.id,
  );
  TestValidator.equals(
    "guestUser join: session.guestUser.id remains stable",
    authorized.session.guestUser.id,
    session.guestUser.id,
  );
}
