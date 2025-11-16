import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministratorSession";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdministratorSession";

/**
 * Test administrator session list enables security monitoring by validating
 * presence of connection metadata.
 *
 * After creating an administrator account which generates an initial session,
 * immediately retrieve the sessions list and verify that the created session
 * appears in the response. Validate that each session record in the response
 * contains essential security audit information: session ID (UUID),
 * administrator ID linking to the administrator account, and creation timestamp
 * showing when login occurred.
 *
 * Verify that the session information provides sufficient detail for
 * administrators to identify and monitor their active sessions while ensuring
 * no sensitive internal system details are exposed in the summary format.
 */
export async function test_api_administrator_sessions_security_monitoring(
  connection: api.IConnection,
) {
  // 1. Create administrator account which generates initial session
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminUsername: string = RandomGenerator.alphaNumeric(8);
  const adminName: string = RandomGenerator.name();

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "https://admin.example.com/auth/join",
        referrer: "https://admin.example.com",
        ip: "192.168.1.100",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Retrieve sessions list for the authenticated administrator
  const sessionsPage: IPageICommunityPlatformAdministratorSession.ISummary =
    await api.functional.communityPlatform.administrator.auth.administrator.sessions.index(
      connection,
    );
  typia.assert(sessionsPage);

  // 3. Validate pagination information
  TestValidator.equals(
    "pagination current page should be 0",
    sessionsPage.pagination.current,
    0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    sessionsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be at least 1",
    sessionsPage.pagination.records >= 1,
  );

  // 4. Validate session exists in the list
  TestValidator.predicate(
    "sessions list should contain at least one session",
    sessionsPage.data.length > 0,
  );

  // 5. Validate first session contains all required security audit information
  const session: ICommunityPlatformAdministratorSession.ISummary =
    sessionsPage.data[0];
  typia.assert(session);

  // 6. Verify session ID is present and in UUID format
  TestValidator.predicate(
    "session ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.id,
    ),
  );

  // 7. Verify administrator ID links to created administrator account
  TestValidator.equals(
    "administrator ID should match created admin",
    session.administrator_id,
    admin.id,
  );

  // 8. Verify creation timestamp shows when login occurred
  TestValidator.predicate(
    "created_at should be valid ISO datetime format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.created_at),
  );

  // 9. Validate that creation timestamp is reasonable (not in future)
  const now = new Date();
  const sessionTime = new Date(session.created_at);
  TestValidator.predicate(
    "session creation time should not be in future",
    sessionTime <= now,
  );

  // 10. Validate that session creation is recent (within last minute)
  const oneMinuteAgo = new Date(now.getTime() - 60000);
  TestValidator.predicate(
    "session should have been created recently",
    sessionTime >= oneMinuteAgo,
  );

  // 11. Validate that no sensitive information is exposed in session summary
  // Check that password hashes are not included
  TestValidator.predicate(
    "session summary should not expose sensitive credentials",
    !JSON.stringify(session).toLowerCase().includes("password") &&
      !JSON.stringify(session).toLowerCase().includes("hash") &&
      !JSON.stringify(session).toLowerCase().includes("secret"),
  );

  // 12. Validate session object only contains expected fields
  const sessionKeys = Object.keys(session);
  TestValidator.predicate(
    "session should contain required fields",
    sessionKeys.includes("id") &&
      sessionKeys.includes("administrator_id") &&
      sessionKeys.includes("created_at"),
  );
}
