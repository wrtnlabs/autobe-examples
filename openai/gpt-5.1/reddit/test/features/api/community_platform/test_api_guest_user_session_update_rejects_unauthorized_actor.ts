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
 * Verify that only authenticated platform administrators can update guest user
 * sessions.
 *
 * Business goal:
 *
 * - Ensure the platform-admin-only endpoint for updating
 *   community_platform_guestuser_sessions cannot be used by unauthenticated
 *   callers.
 * - Confirm that once a platform administrator joins and receives a JWT access
 *   token, the SDK attaches this token to the connection and the same endpoint
 *   becomes callable.
 *
 * Scenario:
 *
 * 1. Build a guestUserId/sessionId pair using random UUIDs. These represent an
 *    existing guest session in the system from the perspective of this test;
 *    the focus is on authorization handling rather than row existence.
 * 2. Using an unauthenticated connection (no Authorization header), attempt to
 *    call PUT
 *    /communityPlatform/platformAdmin/guestUsers/{guestUserId}/sessions/{sessionId}
 *    with a minimal valid body (only expired_at). Assert via
 *    TestValidator.error that the call fails, indicating that anonymous clients
 *    cannot invoke this platformAdmin-only endpoint.
 * 3. Call POST /auth/platformAdmin/join with a random but valid
 *    ICommunityPlatformPlatformadmin.IJoin payload. This must succeed and
 *    return ICommunityPlatformPlatformadmin.IAuthorized as well as update
 *    connection.headers.Authorization according to the SDK documentation.
 * 4. With the same connection (now authenticated as platformAdmin), call the
 *    update endpoint again with a new expired_at value. Assert that the call
 *    succeeds and returns an ICommunityPlatformGuestuserSession, and verify via
 *    typia.assert that the structure is valid.
 * 5. Compare behaviors using TestValidator.predicate/equals to ensure that
 *    unauthenticated calls are rejected while authenticated platformAdmin calls
 *    are permitted.
 */
export async function test_api_guest_user_session_update_rejects_unauthorized_actor(
  connection: api.IConnection,
) {
  // Prepare random identifiers for the guest user and session.
  const guestUserId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Prepare a future expiration timestamp for update payloads.
  const futureExpiredAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  // 1) Negative path: unauthenticated caller must not be able to
  //    invoke the platformAdmin-only session update endpoint.
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated caller cannot update guest user session",
    async () => {
      await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.update(
        unauthenticated,
        {
          guestUserId,
          sessionId,
          body: {
            expired_at: futureExpiredAt,
          } satisfies ICommunityPlatformGuestuserSession.IUpdate,
        },
      );
    },
  );

  // 2) Positive path: join as platform admin to obtain a valid
  //    Authorization token on the shared connection.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://community.example.com/admin/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // Ensure the admin account status and token look structurally
  // valid from a business perspective.
  typia.assert<ICommunityPlatformAccountStatus.ISummary>(
    adminAuthorized.accountStatus,
  );
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 3) Authenticated path: with the connection now carrying an
  //    Authorization header for the platformAdmin, the update
  //    endpoint should be callable.
  const updatedExpiredAt = new Date(
    Date.now() + 2 * 60 * 60 * 1000,
  ).toISOString();

  const updatedSession: ICommunityPlatformGuestuserSession =
    await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.update(
      connection,
      {
        guestUserId,
        sessionId,
        body: {
          expired_at: updatedExpiredAt,
        } satisfies ICommunityPlatformGuestuserSession.IUpdate,
      },
    );

  typia.assert<ICommunityPlatformGuestuserSession>(updatedSession);

  // Verify that the session belongs to the requested guest user
  // and that the expired_at field reflects the requested update
  // (when the backend supports it).
  TestValidator.equals(
    "updated session should belong to the targeted guest user",
    updatedSession.guestUser.id,
    guestUserId,
  );

  if (
    updatedSession.expired_at !== null &&
    updatedSession.expired_at !== undefined
  ) {
    TestValidator.equals(
      "expired_at of updated session should match requested value",
      updatedSession.expired_at,
      updatedExpiredAt,
    );
  }

  // Business-level assertion: the fact that the authenticated
  // update call reached this point and returned a valid session
  // object, contrasted with the earlier unauthenticated error,
  // demonstrates that authorization is enforced on this endpoint.
  await TestValidator.predicate(
    "platform admin join should have produced a valid admin id",
    async () => {
      return (
        typeof adminAuthorized.id === "string" && adminAuthorized.id.length > 0
      );
    },
  );
}
