import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuserSession";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserSecurityEventOfGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEventOfGuestuser";

/**
 * Validate that requesting a guest-linked user security event with a UUID that
 * does not correspond to any existing event results in a clean error instead of
 * returning a record.
 *
 * Business context:
 *
 * - Platform administrators can inspect guest-linked security events for forensic
 *   and monitoring purposes via GET
 *   /communityPlatform/guestUser/userSecurityEvents/{securityEventId}/guest.
 * - If the requested securityEventId does not exist (or is not linked to a
 *   guest), the endpoint should fail with a not-found style error rather than
 *   returning arbitrary data.
 * - We cannot test malformed UUIDs directly because the SDK enforces `string &
 *   tags.Format<"uuid">` and E2E tests must remain type‑correct.
 *
 * Steps:
 *
 * 1. Join a new platform administrator to obtain a valid admin JWT and attach it
 *    to the connection (api.functional.auth.platformAdmin.join).
 * 2. Optionally create a simple account status definition to keep the environment
 *    realistic
 *    (api.functional.communityPlatform.platformAdmin.accountStatuses.create).
 * 3. Generate a random UUID that we treat as a non-existent securityEventId.
 * 4. Call api.functional.communityPlatform.guestUser.userSecurityEvents.guest.at
 *    with that UUID.
 * 5. Assert that the call fails via TestValidator.error, meaning the API does not
 *    return a guest-linked security event for an unknown UUID.
 */
export async function test_api_platform_admin_guest_security_event_detail_invalid_uuid(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and obtain JWT
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Optionally create an account status for realism
  const statusCreateBody = {
    key: "ACTIVE",
    label: "Active",
    description: "Default active account status for all actors.",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: statusCreateBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // 3. Generate a UUID that we assume does not exist as a security event
  const nonExistingSecurityEventId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4 & 5. Assert that requesting this non-existent guest-linked security
  // event fails instead of returning a record.
  await TestValidator.error(
    "guest security event lookup with unknown UUID should fail",
    async () => {
      const result =
        await api.functional.communityPlatform.guestUser.userSecurityEvents.guest.at(
          connection,
          {
            securityEventId: nonExistingSecurityEventId,
          },
        );

      // If the call unexpectedly succeeds, still assert the shape so that any
      // mismatch is caught strongly.
      typia.assert<ICommunityPlatformUserSecurityEventOfGuestuser>(result);
    },
  );
}
