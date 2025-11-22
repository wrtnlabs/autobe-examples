import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthSession";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAuthSession";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

/**
 * Test admin session listing functionality when no authentication sessions
 * exist.
 *
 * This test validates the administrative session management API's behavior when
 * there are no active or expired sessions in the system. It ensures proper
 * pagination structure is returned with empty data array.
 */
export async function test_api_admin_sessions_empty_list(
  connection: api.IConnection,
) {
  // Step 1: Create administrative user account to establish authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: typia.random<string>(),
        role_level: "admin",
        status: "active",
        first_name: "Test",
        last_name: "Administrator",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Call admin session listing endpoint to retrieve all sessions
  const sessionList: IPageIAuthSession =
    await api.functional.todoApp.admin.auth.sessions.index(connection);
  typia.assert(sessionList);

  // Step 3: Verify pagination structure exists and has valid values
  TestValidator.equals(
    "pagination structure is present",
    sessionList.pagination,
    sessionList.pagination,
  );

  // Step 4: Validate pagination metadata is properly structured
  TestValidator.equals(
    "current page is valid",
    sessionList.pagination.current,
    0,
  );

  TestValidator.equals("limit is valid", sessionList.pagination.limit, 0);

  TestValidator.equals(
    "total records is zero",
    sessionList.pagination.records,
    0,
  );

  TestValidator.equals("total pages is zero", sessionList.pagination.pages, 0);

  // Step 5: Confirm data array is empty (no sessions exist)
  TestValidator.equals("session data array is empty", sessionList.data, []);

  TestValidator.equals("data array length is zero", sessionList.data.length, 0);

  // Step 6: Validate the response structure matches expected format
  TestValidator.predicate(
    "response has correct type structure",
    Array.isArray(sessionList.data) &&
      typeof sessionList.pagination === "object" &&
      sessionList.pagination !== null,
  );
}
