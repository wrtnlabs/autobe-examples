import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadminSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPlatformadminSession";

/**
 * Validate that platform admin session GET endpoint does not leak sessions
 * across admins.
 *
 * Business goal:
 *
 * - Ensure that a session created for Admin A cannot be fetched by Admin B using
 *   the path parameters (platformAdminId=B, sessionId belonging to A).
 * - The endpoint must respond with an error (not-found or access-denied style),
 *   and must not disclose whether the session actually exists for another
 *   admin.
 *
 * Workflow:
 *
 * 1. Admin A joins via POST /auth/platformAdmin/join (creating admin row +
 *    session).
 * 2. Admin A creates a platform setting via POST
 *    /communityPlatform/platformAdmin/platformSettings to satisfy the
 *    dependency that platform settings exist (business context only).
 * 3. While still authenticated as Admin A, list their sessions via PATCH
 *    /communityPlatform/platformAdmin/platformAdmins/{platformAdminId}/sessions
 *    with a broad filter, then pick one session id (sessionAId) from the first
 *    page.
 * 4. Admin B joins via POST /auth/platformAdmin/join, which also updates the
 *    connection Authorization token to represent Admin B.
 * 5. Using Admin B's token, call GET
 *    /communityPlatform/platformAdmin/platformAdmins/{platformAdminId}/sessions/{sessionId}
 *    with platformAdminId=B.id and sessionId=sessionAId.
 * 6. Assert that this cross-admin access attempt fails (an error is thrown) using
 *    TestValidator.error, without asserting specific HTTP status codes.
 */
export async function test_api_platform_admin_session_get_not_found_for_mismatched_admin(
  connection: api.IConnection,
) {
  // 1. Admin A joins and obtains authorized profile + token
  const adminAJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: typia.random<ICommunityPlatformPlatformadmin.IJoin>(),
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAJoin);

  const adminAId = adminAJoin.id;

  // 2. As Admin A, create a platform setting to satisfy dependency
  const platformSettingCreateBody = {
    key: RandomGenerator.alphaNumeric(16),
    value: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const createdSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: platformSettingCreateBody,
      },
    );
  typia.assert<ICommunityPlatformPlatformSetting>(createdSetting);

  // 3. Still as Admin A, list their sessions with a broad filter
  const sessionsPage =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.index(
      connection,
      {
        platformAdminId: adminAId,
        body: {
          page: undefined,
          limit: undefined,
          created_at_from: null,
          created_at_to: null,
        } satisfies ICommunityPlatformPlatformadminSession.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformPlatformadminSession.ISummary>(
    sessionsPage,
  );

  // Ensure we have at least one session to work with
  TestValidator.predicate(
    "Admin A sessions listing must contain at least one session",
    sessionsPage.data.length > 0,
  );

  const sessionAId: string & tags.Format<"uuid"> = sessionsPage.data[0].id;

  // 4. Admin B joins, switching the connection Authorization token to Admin B
  const adminBJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: typia.random<ICommunityPlatformPlatformadmin.IJoin>(),
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminBJoin);

  const adminBId = adminBJoin.id;

  // 5 & 6. Using Admin B token, attempt to fetch Admin A's session and expect error
  await TestValidator.error(
    "mismatched admin must not read another admin session",
    async () => {
      await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.at(
        connection,
        {
          platformAdminId: adminBId,
          sessionId: sessionAId,
        },
      );
    },
  );
}
