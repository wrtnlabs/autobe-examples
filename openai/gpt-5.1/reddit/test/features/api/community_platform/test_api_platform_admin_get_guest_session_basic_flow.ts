import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuserSession";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Basic happy-path flow for inspecting a single guest user session as a
 * platform admin.
 *
 * Business story (aligned with available APIs):
 *
 * 1. A new platform administrator joins the system via /auth/platformAdmin/join.
 *
 *    - This both creates the admin row and establishes an authenticated session with
 *         JWT tokens wired into the SDK connection.
 * 2. The authenticated platform admin defines at least one account status master
 *    record via POST /communityPlatform/platformAdmin/accountStatuses, ensuring
 *    the platform has a usable status catalog.
 * 3. The platform admin calls GET
 *    /communityPlatform/platformAdmin/guestUsers/{guestUserId}/sessions/{sessionId}
 *    using the admin-authenticated connection, passing UUIDs for guestUserId
 *    and sessionId.
 *
 *    - Because guest user / session creation APIs are not provided here, we rely on
 *         the SDK (and simulator mode where applicable) to return a session
 *         DTO.
 * 4. The test validates that the response:
 *
 *    - Conforms exactly to ICommunityPlatformGuestuserSession via typia.assert.
 *    - Contains non-empty core fields such as ip, href, referrer, created_at.
 *    - Embeds a guestUser summary that itself has non-empty id and created_at, and,
 *         when present, an accountStatus summary with non-empty key/label.
 *
 * We intentionally do NOT:
 *
 * - Force equality between the requested IDs and the returned DTO IDs, because
 *   guest/session creation APIs are not available and the simulator may
 *   generate arbitrary UUIDs.
 * - Test error status codes or type-mismatch scenarios, in line with the AutoBE
 *   E2E testing rules.
 */
export async function test_api_platform_admin_get_guest_session_basic_flow(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and becomes authenticated.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    // ip is optional; provide a realistic IPv4-like string
    ip: "203.0.113.10",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // Basic sanity checks about the authorized admin payload.
  TestValidator.predicate(
    "platform admin id should be non-empty",
    admin.id.length > 0,
  );
  TestValidator.predicate(
    "platform admin token access should be non-empty",
    admin.token.access.length > 0,
  );

  // 2. Create an account status master record as platform admin.
  const statusBody = {
    key: "GUEST_ACTIVE",
    label: "Guest Active",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  TestValidator.predicate(
    "created account status key should match input key",
    createdStatus.key === statusBody.key,
  );

  // 3. Retrieve a guest user session via sessions.at as platform admin.
  const guestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const session: ICommunityPlatformGuestuserSession =
    await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.at(
      connection,
      {
        guestUserId,
        sessionId,
      },
    );

  // Strong type-shape validation.
  typia.assert<ICommunityPlatformGuestuserSession>(session);

  // 4. Business-level sanity validations on the session fields.
  TestValidator.predicate(
    "guest session id should be non-empty",
    session.id.length > 0,
  );
  TestValidator.predicate(
    "guest session ip should be non-empty",
    session.ip.length > 0,
  );
  TestValidator.predicate(
    "guest session href should be non-empty",
    session.href.length > 0,
  );
  TestValidator.predicate(
    "guest session referrer should be non-empty",
    session.referrer.length > 0,
  );
  TestValidator.predicate(
    "guest session created_at should be non-empty",
    session.created_at.length > 0,
  );

  if (session.expired_at !== null && session.expired_at !== undefined) {
    TestValidator.predicate(
      "guest session expired_at, when present, should be non-empty",
      session.expired_at.length > 0,
    );
  }

  // Validate embedded guest user summary.
  const guest = session.guestUser;
  TestValidator.predicate(
    "guest user id in session should be non-empty",
    guest.id.length > 0,
  );
  TestValidator.predicate(
    "guest user created_at in session should be non-empty",
    guest.created_at.length > 0,
  );

  if (guest.accountStatus !== undefined) {
    TestValidator.predicate(
      "guest user accountStatus key should be non-empty when present",
      guest.accountStatus.key.length > 0,
    );
    TestValidator.predicate(
      "guest user accountStatus label should be non-empty when present",
      guest.accountStatus.label.length > 0,
    );
  }
}
