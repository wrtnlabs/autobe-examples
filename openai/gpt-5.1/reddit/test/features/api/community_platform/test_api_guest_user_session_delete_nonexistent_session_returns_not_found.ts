import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that deleting a non-existent guest user session as a platform
 * administrator results in an error (not-found style) and does not succeed
 * silently.
 *
 * Business context: Platform administrators can hard-delete guest user sessions
 * for security/audit workflows. When they target a guestUserId/sessionId
 * combination that does not exist (or does not belong together), the system
 * must reject the request with an appropriate error rather than treating it as
 * a successful deletion.
 *
 * Scenario steps implemented:
 *
 * 1. Register and authenticate a platform admin via POST /auth/platformAdmin/join.
 *
 *    - This ensures the connection carries a valid admin JWT and all platformAdmin
 *         endpoints are authorized.
 * 2. Create a platform-wide configuration entry via POST
 *    /communityPlatform/platformAdmin/platformSettings.
 *
 *    - This follows the scenario dependency that some platform setting exists and
 *         exercises the admin context.
 * 3. Generate a guestUserId/sessionId pair that is extremely unlikely to exist
 *    (fresh random strings) and use them as path parameters.
 * 4. Call DELETE
 *    /communityPlatform/platformAdmin/guestUsers/{guestUserId}/sessions/{sessionId}
 *    through
 *    api.functional.communityPlatform.platformAdmin.guestUsers.sessions.erase
 *    using those random identifiers.
 * 5. Assert, using TestValidator.error, that the erase call fails by throwing an
 *    error instead of resolving successfully.
 *
 *    - We do not pin to a specific HTTP status code (like 404) because test policy
 *         forbids explicit HTTP status assertions; we only require that an
 *         error is thrown.
 * 6. Because we have not created any guest sessions and we lack
 *    listing/introspection endpoints, we interpret "no other sessions are
 *    affected" as: the operation fails with an HttpError and no additional
 *    observable side effects in this test.
 */
export async function test_api_guest_user_session_delete_nonexistent_session_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const adminJoinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a platform-wide configuration setting as a prerequisite.
  const platformSettingBody = {
    key: `test.nonexistentSessionDeletion.${RandomGenerator.alphaNumeric(12)}`,
    value: JSON.stringify({
      feature: "guestSessionDeletion",
      mode: "strict",
    }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const platformSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: platformSettingBody,
      },
    );
  typia.assert(platformSetting);

  // 3. Prepare a guestUserId/sessionId pair that should not exist.
  const nonexistentGuestUserId: string = typia.random<string>();
  const nonexistentSessionId: string = typia.random<string>();

  // 4-5. Attempt to delete the nonexistent guest session and expect an error.
  await TestValidator.error(
    "deleting a nonexistent guest user session must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.guestUsers.sessions.erase(
        connection,
        {
          guestUserId: nonexistentGuestUserId,
          sessionId: nonexistentSessionId,
        },
      );
    },
  );
}
