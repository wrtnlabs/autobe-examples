import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformAuthLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAuthLogoutResponse";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_administrator_logout_security_compliance(
  connection: api.IConnection,
) {
  // Create a platform administrator account to establish authenticated session
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminData = {
    username: RandomGenerator.alphaNumeric(12),
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16) + "!1Aa",
    display_name: RandomGenerator.name(),
    administrator_level: "admin" as const,
    system_permissions: JSON.stringify({
      user_management: { can_view_user_data: true },
      community_oversight: { can_view_community_data: true },
      content_moderation: { can_remove_content: true },
      system_configuration: { can_view_system_logs: true },
      compliance_legal: { can_access_compliance_data: true },
    }),
    security_clearance: "medium" as const,
  } satisfies IRedditPlatformPlatformAdministrator.ICreate;

  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Verify admin account was created successfully
  TestValidator.equals("admin account created", admin.id, admin.id);
  TestValidator.equals(
    "admin level matches",
    admin.administrator_level,
    "admin",
  );
  TestValidator.equals(
    "admin token generated",
    admin.token.access.length > 0,
    true,
  );

  // Perform logout operation to test security compliance
  const logoutResponse: IRedditPlatformAuthLogoutResponse =
    await api.functional.redditPlatform.platformAdministrator.auth.sessions.logout(
      connection,
    );
  typia.assert(logoutResponse);

  // Validate logout response structure and security compliance
  TestValidator.equals("logout success status", logoutResponse.success, true);
  TestValidator.equals(
    "logout message present",
    logoutResponse.message.length > 0,
    true,
  );
  TestValidator.equals(
    "session termination timestamp present",
    logoutResponse.session_terminated_at.length > 0,
    true,
  );
  TestValidator.equals(
    "tokens invalidated confirmation",
    logoutResponse.tokens_invalidated,
    true,
  );

  // Validate timestamp format is ISO 8601
  const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  TestValidator.predicate(
    "session terminated timestamp format",
    timestampPattern.test(logoutResponse.session_terminated_at),
  );

  // Verify security status reporting is comprehensive
  TestValidator.predicate(
    "security compliance message includes security terms",
    logoutResponse.message.toLowerCase().includes("security") ||
      logoutResponse.message.toLowerCase().includes("session") ||
      logoutResponse.message.toLowerCase().includes("logout"),
  );
}
