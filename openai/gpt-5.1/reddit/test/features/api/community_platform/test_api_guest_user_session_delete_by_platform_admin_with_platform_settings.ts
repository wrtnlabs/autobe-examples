import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can delete a guest user session when
 * platform-wide platform settings exist.
 *
 * ## Business context
 *
 * The community platform exposes administrative endpoints for:
 *
 * - Registering a new platform administrator and issuing JWT tokens
 * - Creating platform-wide configuration settings used for security/retention
 * - Deleting individual guest user sessions by guestUserId and sessionId
 *
 * In this contract-level E2E test we model the happy-path where:
 *
 * 1. A new platformAdmin joins the system and receives an authorization token.
 * 2. The authenticated platformAdmin creates at least one platform setting
 *    representing some global configuration (for example, enabling guest
 *    session cleanup).
 * 3. The same platformAdmin calls the DELETE guestUsers.sessions.erase endpoint
 *    with some concrete guestUserId/sessionId pair.
 *
 * Due to the absence of dedicated guest-user / guest-session creation and read
 * APIs in the current SDK surface, we cannot create a real
 * community_platform_guestuser_sessions row or re-fetch it for 404/not-found
 * verification. Instead, this test focuses on verifying that:
 *
 * - The platformAdmin authentication and token plumbing works end-to-end.
 * - Platform settings can be created successfully for an authenticated admin.
 * - The DELETE guestUsers.sessions.erase endpoint is callable with authenticated
 *   platformAdmin context and correctly shaped path parameters without causing
 *   type or transport-level failures.
 *
 * ## Test steps
 *
 * 1. Call POST /auth/platformAdmin/join to register a platform administrator using
 *    a concrete ICommunityPlatformPlatformadmin.IJoin payload.
 *
 *    - Verify the response shape with typia.assert.
 *    - Rely on the SDK to attach the access token into connection.headers.
 * 2. Call POST /communityPlatform/platformAdmin/platformSettings with an
 *    ICommunityPlatformPlatformSetting.ICreate payload to register a
 *    platform-wide configuration entry, marking it as active.
 *
 *    - Verify the response shape with typia.assert.
 * 3. Call DELETE
 *    /communityPlatform/platformAdmin/guestUsers/{guestUserId}/sessions/{sessionId}
 *    via
 *    api.functional.communityPlatform.platformAdmin.guestUsers.sessions.erase.
 *
 *    - Use random string values for guestUserId and sessionId, which are typed as
 *         plain string in the SDK.
 *    - Await the call and ensure no error is thrown.
 * 4. Use TestValidator.predicate with a descriptive title to confirm that the
 *    erase call has completed successfully.
 */
export async function test_api_guest_user_session_delete_by_platform_admin_with_platform_settings(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and obtain an authenticated context
  const joinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a platform-wide setting as the authenticated platformAdmin
  const platformSettingBody = {
    key: `guest.session.retention.${RandomGenerator.alphaNumeric(8)}`,
    value: JSON.stringify({ retentionDays: 30, deletionEnabled: true }),
    description:
      "Controls guest session retention window and whether hard-deletion APIs are enabled.",
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const platformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: platformSettingBody,
      },
    );
  typia.assert<ICommunityPlatformPlatformSetting>(platformSetting);

  // 3. Issue a DELETE for a guest user session using random IDs
  const guestUserId = RandomGenerator.alphaNumeric(24);
  const sessionId = RandomGenerator.alphaNumeric(24);

  let eraseCompleted = false;
  await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.erase(
    connection,
    {
      guestUserId,
      sessionId,
    },
  );
  eraseCompleted = true;

  // 4. Validate that the erase call completed without throwing
  TestValidator.predicate(
    "platform admin guest session erase call should complete",
    eraseCompleted,
  );
}
