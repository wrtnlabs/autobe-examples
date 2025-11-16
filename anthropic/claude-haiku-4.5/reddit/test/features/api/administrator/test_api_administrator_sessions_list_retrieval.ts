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
 * Test successful retrieval of all active administrator sessions.
 *
 * This test validates that an authenticated administrator can view all their
 * active sessions across multiple devices with complete session metadata. The
 * test verifies that the paginated response includes all active session records
 * with pagination information, that session data contains proper IDs and
 * creation timestamps, and that only sessions belonging to the authenticated
 * administrator are returned (not sessions from other administrators).
 *
 * Steps:
 *
 * 1. Create a new administrator account via join endpoint
 * 2. Retrieve all active administrator sessions for the authenticated user
 * 3. Validate response structure matches
 *    IPageICommunityPlatformAdministratorSession.ISummary
 * 4. Verify pagination metadata (current page, limit, total records, total pages)
 * 5. Validate session data contains proper
 *    ICommunityPlatformAdministratorSession.ISummary items
 * 6. Ensure only sessions for this administrator are included
 * 7. Verify active sessions are returned with valid data
 */
export async function test_api_administrator_sessions_list_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminName = RandomGenerator.name();
  const adminHref = "https://example.com/admin/join";
  const adminReferrer = "https://example.com";

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    username: adminUsername,
    name: adminName,
    href: adminHref,
    referrer: adminReferrer,
    ip: "192.168.1.1",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(createdAdmin);

  // Validate administrator account creation
  TestValidator.equals(
    "created admin email matches input",
    createdAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "created admin username matches input",
    createdAdmin.username,
    adminUsername,
  );
  TestValidator.predicate(
    "admin account is active",
    createdAdmin.account_status === "active",
  );

  // Step 2: Retrieve all active administrator sessions
  const sessionResponse: IPageICommunityPlatformAdministratorSession.ISummary =
    await api.functional.communityPlatform.administrator.auth.administrator.sessions.index(
      connection,
    );
  typia.assert(sessionResponse);

  // Step 3: Validate response structure
  TestValidator.predicate(
    "response has pagination object",
    sessionResponse.pagination !== undefined &&
      sessionResponse.pagination !== null,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(sessionResponse.data),
  );

  // Step 4: Validate pagination metadata
  const pagination: IPage.IPagination = sessionResponse.pagination;
  TestValidator.predicate(
    "pagination current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination total records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is non-negative",
    pagination.pages >= 0,
  );

  // Step 5: Validate session data structure
  const sessions: ICommunityPlatformAdministratorSession.ISummary[] =
    sessionResponse.data;

  if (sessions.length > 0) {
    // Validate each session with typia.assert for complete type validation
    for (const session of sessions) {
      typia.assert(session);
    }

    // Step 6: Ensure sessions belong to authenticated administrator
    const adminId = createdAdmin.id;
    for (const session of sessions) {
      TestValidator.equals(
        "session administrator_id matches authenticated admin",
        session.administrator_id,
        adminId,
      );
    }
  }

  // Step 7: Verify data array contains expected number of items
  TestValidator.predicate(
    "data array length does not exceed total records",
    sessions.length <= pagination.records,
  );
}
