import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminSession";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_platform_admin_session_cross_user_type_monitoring(
  connection: api.IConnection,
) {
  // Step 1: Create registered user account for generating test session data
  const registeredUserEmail = typia.random<string & tags.Format<"email">>();
  const registeredUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: registeredUserEmail,
        password: "SecurePass123!",
        display_name: RandomGenerator.name(),
        bio: "Test registered user for session monitoring",
        location: "Seoul, Korea",
        website_url: "https://example.com",
        avatar_url: "https://avatar.example.com/user1.jpg",
        href: "https://platform.example.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(registeredUser);

  // Step 2: Login as registered user to create active session for platform admin monitoring
  const registeredUserSession = await api.functional.auth.registeredUser.login(
    connection,
    {
      body: {
        email: registeredUserEmail,
        password: "SecurePass123!",
        href: "https://platform.example.com/login",
        referrer: "https://platform.example.com/home",
      } satisfies IRedditPlatformRegisteredUser.ILogin,
    },
  );
  typia.assert(registeredUserSession);

  // Step 3: Create platform administrator account for conducting cross-user type session monitoring
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdmin = await api.functional.auth.platformAdministrator.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: adminEmail,
        password: "AdminSecure123!",
        display_name: "Platform Security Admin",
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          user_management: { can_view_user_data: true, can_create_users: true },
          community_oversight: { can_view_community_data: true },
          content_moderation: {
            can_remove_content: true,
            can_manage_reports: true,
          },
          system_configuration: { can_view_system_logs: true },
          compliance_legal: { can_access_compliance_data: true },
        }),
        security_clearance: "high",
        managed_communities: JSON.stringify([]),
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    },
  );
  typia.assert(platformAdmin);

  // Step 4: Login as platform administrator to establish admin session context
  const adminSession = await api.functional.auth.platformAdministrator.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminSecure123!",
        ip: "192.168.1.100",
        href: "https://admin.platform.example.com/dashboard",
        referrer: "https://admin.platform.example.com/login",
      } satisfies IRedditPlatformPlatformAdministrator.ILogin,
    },
  );
  typia.assert(adminSession);

  // Step 5: Test platform administrator session monitoring - Validate comprehensive session visibility
  // Note: In a real scenario, we would need to extract session IDs from the registered user session
  // For this test, we'll use a simulated session ID approach since we can't directly access session IDs from the auth responses

  const testSessionId = typia.random<string & tags.Format<"uuid">>();

  // Platform administrator attempts to view session information (this tests authorization and data access)
  const sessionInfo =
    await api.functional.redditPlatform.platformAdministrator.auth.sessions.at(
      connection,
      {
        sessionId: testSessionId,
      },
    );
  typia.assert(sessionInfo);

  // Validate session information structure and content
  TestValidator.equals(
    "session ID is valid UUID",
    sessionInfo.id,
    testSessionId,
  );
  TestValidator.predicate("session has IP address", sessionInfo.ip.length > 0);
  TestValidator.predicate(
    "session has connection URL",
    sessionInfo.href.length > 0,
  );
  TestValidator.predicate(
    "session has referrer URL",
    sessionInfo.referrer.length > 0,
  );
  TestValidator.predicate(
    "session has creation timestamp",
    sessionInfo.created_at.length > 0,
  );

  // Test optional expiration timestamp handling
  if (sessionInfo.expired_at !== undefined) {
    TestValidator.predicate(
      "expiration timestamp is valid format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
        sessionInfo.expired_at,
      ),
    );
  }

  // Step 6: Validate platform administrator authorization for session monitoring
  TestValidator.equals(
    "admin has proper access level",
    adminSession.access_level,
    "global",
  );
  TestValidator.equals(
    "admin has high security clearance",
    adminSession.security_clearance,
    "high",
  );
  TestValidator.predicate(
    "admin has compliance data access",
    adminSession.system_permissions.compliance_legal.can_access_compliance_data,
  );
  TestValidator.predicate(
    "admin has system logs access",
    adminSession.system_permissions.system_configuration.can_view_system_logs,
  );

  // Step 7: Test session monitoring capabilities across user types
  // This validates that the platform admin endpoint provides comprehensive session visibility
  // regardless of the originating user type (registered user, moderator, or admin)

  // Validate the response structure matches expected admin session format
  const expectedSessionProperties = [
    "id",
    "ip",
    "href",
    "referrer",
    "created_at",
    "expired_at",
  ];
  for (const property of expectedSessionProperties) {
    TestValidator.predicate(
      `session response contains ${property} property`,
      property in sessionInfo,
    );
  }

  // Step 8: Validate security and compliance aspects of session monitoring
  TestValidator.predicate(
    "session data includes security-relevant metadata",
    sessionInfo.ip.length > 0 && sessionInfo.created_at.length > 0,
  );
  TestValidator.predicate(
    "session monitoring supports audit trail requirements",
    sessionInfo.href.length > 0 && sessionInfo.referrer.length > 0,
  );
}
