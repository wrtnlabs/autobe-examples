import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

/**
 * Test error handling for non-existent member session retrieval attempts.
 *
 * This test validates that administrators receive appropriate error responses
 * when attempting to retrieve session data that doesn't exist. It creates a
 * complete member account but uses invalid session IDs to test the system's
 * robustness against invalid input for security audit workflows.
 */
export async function test_api_admin_member_session_retrieval_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
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

  // Step 2: Create member account for session context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Authenticate as admin before attempting admin operations
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      ip: "192.168.1.1",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Admin Browser",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 4: Attempt to retrieve non-existent session with invalid session ID
  const invalidSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "retrieving non-existent session should fail",
    async () => {
      await api.functional.communityPlatform.admin.members.sessions.at(
        connection,
        {
          memberId: member.id,
          sessionId: invalidSessionId,
        },
      );
    },
  );

  // Step 5: Attempt to retrieve session with non-existent member ID
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "retrieving session for non-existent member should fail",
    async () => {
      await api.functional.communityPlatform.admin.members.sessions.at(
        connection,
        {
          memberId: nonExistentMemberId,
          sessionId: invalidSessionId,
        },
      );
    },
  );
}
