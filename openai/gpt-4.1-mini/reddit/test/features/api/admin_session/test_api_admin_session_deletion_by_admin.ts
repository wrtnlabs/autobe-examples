import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSession";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

/**
 * Test the complete lifecycle of an admin session including creation and
 * deletion.
 *
 * This test covers the following workflow:
 *
 * 1. Admin joins (registers a new admin account).
 * 2. Creates a corresponding admin user entity linked to the registered user.
 * 3. Creates a new admin session for that admin.
 * 4. Deletes the created admin session.
 * 5. Verifies that the session deletion succeeded without errors.
 *
 * The test ensures secure session termination mechanisms and validates that
 * deleted sessions cannot be accessed further.
 */
export async function test_api_admin_session_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins, creating a new admin account
  const createdAdminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(createdAdminAuthorized);

  // 2. Create corresponding admin user entity linked to the registered user
  const createdAdmin: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.admins.create(connection, {
      body: {
        user_id: createdAdminAuthorized.user_id,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // 3. Create a new admin session for the created admin
  const newSessionBody = {
    ip: "127.0.0.1",
    href: "https://admin.redditcommunity.example.com/dashboard",
    referrer: "https://admin.redditcommunity.example.com/login",
    expired_at: null,
  } satisfies IRedditCommunityAdminSession.ICreate;

  const createdSession: IRedditCommunityAdminSession =
    await api.functional.redditCommunity.admin.admins.sessions.create(
      connection,
      {
        adminId: createdAdmin.id,
        body: newSessionBody,
      },
    );
  typia.assert(createdSession);

  // 4. Delete the created admin session
  await api.functional.redditCommunity.admin.admins.sessions.eraseSession(
    connection,
    {
      adminId: createdAdmin.id,
      sessionId: createdSession.id,
    },
  );

  // 5. Verify deletion (attempting to delete same session again should error)
  await TestValidator.error(
    "deleting same admin session again should fail",
    async () => {
      await api.functional.redditCommunity.admin.admins.sessions.eraseSession(
        connection,
        {
          adminId: createdAdmin.id,
          sessionId: createdSession.id,
        },
      );
    },
  );
}
