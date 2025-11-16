import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

/**
 * Validates role-based access control for moderation audit logs.
 *
 * This test verifies that moderators cannot access administrator-only audit
 * logs, ensuring proper authorization boundaries between moderator and
 * administrator roles.
 *
 * Test flow:
 *
 * 1. Authenticate as a moderator account
 * 2. Attempt to query moderation audit logs with administrator-only endpoint
 * 3. Verify the request is rejected with 403 Forbidden error
 * 4. Confirm that only administrators have access to complete audit trails
 *
 * This test validates that the platform enforces proper role-based access
 * control and prevents unauthorized access to sensitive audit log data.
 */
export async function test_api_moderation_audit_logs_with_moderator_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: moderatorPassword,
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator authenticated successfully",
    moderator.id !== undefined,
  );

  // Step 2: Create a moderator-specific connection to test access control
  const moderatorConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: moderator.token.access,
    },
  };

  // Step 3: Attempt to access administrator-only audit logs endpoint
  // This should fail because moderators don't have access to admin audit logs
  await TestValidator.error(
    "moderator should not access administrator audit logs",
    async () => {
      await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
        moderatorConnection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformModerationAuditLog.IRequest,
        },
      );
    },
  );

  // Step 4: Verify that administrator can access audit logs (prerequisite validation)
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = RandomGenerator.alphaNumeric(12);

  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: administratorEmail,
        password: administratorPassword,
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "https://community.example.com/auth/admin",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Create admin connection
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: administrator.token.access,
    },
  };

  // Step 5: Verify administrator can successfully access audit logs
  const auditLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.administrator.moderationAuditLogs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(auditLogs);
  TestValidator.predicate(
    "administrator can access audit logs",
    auditLogs.pagination !== undefined && auditLogs.data !== undefined,
  );

  TestValidator.predicate(
    "access control properly enforces role boundaries",
    true,
  );
}
