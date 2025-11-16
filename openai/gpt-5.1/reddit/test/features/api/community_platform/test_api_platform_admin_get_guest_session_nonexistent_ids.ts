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
 * Validate behavior when a platform admin requests a guest session using
 * non-existent guestUserId and sessionId.
 *
 * Business goal: Platform admins must not be able to infer sensitive
 * information about guest sessions when providing identifiers that do not match
 * any stored record. Instead of returning partial data or ambiguous responses,
 * the API should return a clean HTTP error (typically 404 Not Found) without
 * leaking implementation details.
 *
 * Workflow covered by this test:
 *
 * 1. Register a new platform administrator via /auth/platformAdmin/join to obtain
 *    an authenticated context. The SDK will automatically attach the issued
 *    token to the connection.
 * 2. Create a baseline account status master record via
 *    /communityPlatform/platformAdmin/accountStatuses to keep the environment
 *    consistent with a real deployment (although the status is not directly
 *    used for guest sessions here).
 * 3. Generate random UUIDs for guestUserId and sessionId so they are extremely
 *    unlikely to match any actual guest or session row.
 * 4. Call GET
 *    /communityPlatform/platformAdmin/guestUsers/{guestUserId}/sessions/{sessionId}
 *    using
 *    api.functional.communityPlatform.platformAdmin.guestUsers.sessions.at with
 *    those random identifiers.
 * 5. Assert that the call fails with an HTTP 404 error using
 *    TestValidator.httpError, and that no successful session DTO is returned.
 */
export async function test_api_platform_admin_get_guest_session_nonexistent_ids(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (auth context setup)
  const adminJoinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create at least one account status for environmental consistency
  const accountStatusBody =
    typia.random<ICommunityPlatformAccountStatus.ICreate>();
  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: accountStatusBody },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // 3. Generate random, non-existent UUIDs for guestUserId and sessionId
  const nonexistentGuestUserId = typia.random<string & tags.Format<"uuid">>();
  const nonexistentSessionId = typia.random<string & tags.Format<"uuid">>();

  // 4-5. Attempt to fetch the guest session and validate that it results in a 404 HTTP error
  await TestValidator.httpError(
    "requesting a non-existent guest session should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.at(
        connection,
        {
          guestUserId: nonexistentGuestUserId,
          sessionId: nonexistentSessionId,
        },
      );
    },
  );
}
