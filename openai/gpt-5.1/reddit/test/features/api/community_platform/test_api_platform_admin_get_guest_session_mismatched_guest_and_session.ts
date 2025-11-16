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
 * Validate that platform-admin guest session lookup enforces guestUser/session
 * ownership.
 *
 * Business goal: Ensure that GET
 * /communityPlatform/platformAdmin/guestUsers/{guestUserId}/sessions/{sessionId}
 * does not allow a platform admin to retrieve a guest session that does not
 * belong to the specified guestUserId, preventing cross-guest data exposure.
 * Also confirm that the same endpoint works correctly when the guestUserId and
 * sessionId combination is valid.
 *
 * High-level flow:
 *
 * 1. Register and authenticate a platform admin via POST /auth/platformAdmin/join.
 * 2. Create at least one account status via POST
 *    /communityPlatform/platformAdmin/accountStatuses.
 * 3. Fetch a valid guest session via GET
 *    /communityPlatform/platformAdmin/guestUsers/{guestUserId}/sessions/{sessionId}
 *    using random UUIDs under simulation mode to obtain a coherent pair of
 *    guestUser.id and session.id.
 * 4. Construct a mismatched pair by reusing the valid session.id but replacing
 *    guestUserId with a different random UUID.
 * 5. Call the guest session GET endpoint with the mismatched pair and verify that
 *    it fails (error thrown), without relying on specific HTTP status codes.
 * 6. Finally, call the endpoint again with the original correct pair and verify
 *    that it succeeds and the returned session/guestUser ids match the
 *    originals.
 */
export async function test_api_platform_admin_get_guest_session_mismatched_guest_and_session(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const joinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create at least one account status
  const statusBody = typia.random<ICommunityPlatformAccountStatus.ICreate>();
  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusBody },
    );
  typia.assert(accountStatus);

  // 3. Obtain a valid guest session and its owning guest user
  const validSession: ICommunityPlatformGuestuserSession =
    await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.at(
      connection,
      {
        guestUserId: typia.random<string & tags.Format<"uuid">>(),
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(validSession);

  const owningGuest: ICommunityPlatformGuestuser.ISummary =
    validSession.guestUser;
  const owningGuestId = owningGuest.id;
  const sessionId = validSession.id;

  // 4. Build a mismatched pair: different guestUserId but same sessionId
  const mismatchedGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Ensure (best effort) that mismatchedGuestId is different from owningGuestId
  const effectiveMismatchedGuestId: string & tags.Format<"uuid"> =
    mismatchedGuestId === owningGuestId
      ? typia.random<string & tags.Format<"uuid">>()
      : mismatchedGuestId;

  // 5. Expect error when using mismatched guestUserId with a valid sessionId
  await TestValidator.error(
    "platform admin cannot fetch session with mismatched guestUserId and sessionId",
    async () => {
      await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.at(
        connection,
        {
          guestUserId: effectiveMismatchedGuestId,
          sessionId,
        },
      );
    },
  );

  // 6. Using the correct pair should succeed and match original values
  const reloaded: ICommunityPlatformGuestuserSession =
    await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.at(
      connection,
      {
        guestUserId: owningGuestId,
        sessionId,
      },
    );
  typia.assert(reloaded);

  TestValidator.equals(
    "reloaded session id matches original session id",
    reloaded.id,
    sessionId,
  );

  TestValidator.equals(
    "reloaded guest user id matches owning guest user id",
    reloaded.guestUser.id,
    owningGuestId,
  );
}
