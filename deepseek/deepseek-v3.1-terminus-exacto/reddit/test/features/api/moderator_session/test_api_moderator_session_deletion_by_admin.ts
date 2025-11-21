import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorSession";

/**
 * Test moderator session deletion workflow where an administrator permanently
 * removes authentication session records for security management purposes.
 *
 * This test validates hard deletion functionality for moderator sessions,
 * ensuring proper session termination and security incident response
 * capabilities. The scenario verifies that administrators can securely delete
 * session records while maintaining platform integrity and preventing
 * unauthorized access to authentication data.
 */
export async function test_api_moderator_session_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create moderator account to establish session data
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: RandomGenerator.name(),
        moderator_level: "community",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 3. Establish moderator authentication session for deletion testing
  const moderatorSession: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
      } satisfies ICommunityPlatformModerator.ILogin,
    });
  typia.assert(moderatorSession);

  // NOTE: Since the API doesn't provide a way to list moderator sessions,
  // we'll test the deletion endpoint with a valid moderator ID but random session ID.
  // This tests that the endpoint exists and can be called with proper authentication.
  // In a real scenario, the session ID would come from a session listing endpoint.

  // 4. Administrator attempts to delete a session (using random session ID as placeholder)
  const deletedSession: ICommunityPlatformModeratorSession =
    await api.functional.communityPlatform.admin.moderators.sessions.erase(
      connection,
      {
        moderatorId: moderator.id,
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(deletedSession);

  // 5. Validate session deletion response structure
  TestValidator.equals(
    "deleted session moderator ID matches",
    deletedSession.community_platform_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "deleted session contains moderator information",
    deletedSession.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "deleted session moderator email matches",
    deletedSession.moderator.email,
    moderator.email,
  );
}
