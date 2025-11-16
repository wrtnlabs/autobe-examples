import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuserSession";

/**
 * Validate that an authenticated adminUser can inspect an admin session through
 * the admin session inspection endpoint without exposing secrets.
 *
 * Business goals:
 *
 * - Ensure that joining as an adminUser yields an authorized context with a valid
 *   JWT token and identity data.
 * - Use that authenticated context to call the admin session inspection API for a
 *   given {username, sessionId} pair.
 * - Verify that the response conforms to ICommunityPlatformAdminuserSession and
 *   represents a plausible session record (types and key fields).
 * - Confirm that the session DTO does not expose any obvious secret material such
 *   as password hashes or raw tokens.
 *
 * Steps:
 *
 * 1. Register a fresh adminUser via /auth/adminUser/join, capturing the returned
 *    ICommunityPlatformAdminuser.IAuthorized payload.
 * 2. From the join response, extract the admin username for use as the {username}
 *    path parameter.
 * 3. Generate a UUID-like sessionId using typia.random so that the sessions.at
 *    call receives a syntactically valid identifier.
 * 4. Call GET
 *    /communityPlatform/adminUser/adminUsers/{username}/sessions/{sessionId}
 *    via api.functional.communityPlatform.adminUser.adminUsers.sessions.at.
 * 5. Run typia.assert on the response to guarantee it matches
 *    ICommunityPlatformAdminuserSession.
 * 6. Assert general semantics: is_active is boolean, created_at is a non-empty
 *    ISO-like timestamp string, and admin_username is non-empty.
 * 7. Perform a defensive check that no obviously sensitive fields like "password",
 *    "password_hash", or "token" are present on the session object.
 */
export async function test_api_adminuser_session_inspection_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new adminUser
  const joinBody = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();

  const admin = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(admin);

  // 2. Prepare path parameters: username from the authorized context,
  //    and a syntactically valid UUID string for sessionId
  const username = admin.username;
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Call the session inspection endpoint as the authenticated adminUser
  const session =
    await api.functional.communityPlatform.adminUser.adminUsers.sessions.at(
      connection,
      {
        username,
        sessionId,
      },
    );
  typia.assert<ICommunityPlatformAdminuserSession>(session);

  // 4. General semantics: basic expectations on core fields
  TestValidator.predicate(
    "session id is a non-empty UUID-like string",
    typeof session.id === "string" && session.id.length > 0,
  );

  TestValidator.predicate(
    "admin_username is non-empty",
    typeof session.admin_username === "string" &&
      session.admin_username.length > 0,
  );

  TestValidator.predicate(
    "is_active is a boolean flag",
    typeof session.is_active === "boolean",
  );

  TestValidator.predicate(
    "created_at is a non-empty ISO timestamp string",
    typeof session.created_at === "string" && session.created_at.length > 0,
  );

  // 5. Defensive check: ensure no obvious secret fields are present.
  const keys = Object.keys(session);
  const forbiddenSecrets = [
    "password",
    "password_hash",
    "token",
    "access_token",
    "refresh_token",
    "refresh",
  ] as const;

  for (const forbidden of forbiddenSecrets) {
    TestValidator.predicate(
      `session DTO must not expose secret field '${forbidden}'`,
      keys.includes(forbidden) === false,
    );
  }
}
