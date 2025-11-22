import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdministrator";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test administrator list viewing with moderator role privileges.
 *
 * This test validates that users with moderator role can access the
 * administrator list endpoint, verifying role-based access controls and proper
 * authorization. Creates a moderator account, authenticates successfully, and
 * retrieves the administrator list to confirm appropriate access permissions.
 */
export async function test_api_admin_administrators_moderator_view_access(
  connection: api.IConnection,
) {
  // Create moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword: string = "testModerator123!";

  const moderator: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: moderatorEmail,
        password_hash: moderatorPassword,
        role_level: "moderator",
        status: "active",
        first_name: "Test",
        last_name: "Moderator",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(moderator);

  // Verify authentication succeeded and token was generated
  TestValidator.equals(
    "moderator account created successfully",
    moderator.id !== undefined,
    true,
  );
  TestValidator.equals(
    "JWT token generated for moderator",
    moderator.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token generated",
    moderator.token.refresh.length > 0,
    true,
  );

  // Access administrator list with moderator credentials
  const adminList: IPageITodoAppAdministrator.ISummary =
    await api.functional.todoApp.admin.administrators.at(connection);
  typia.assert(adminList);

  // Validate response structure and pagination
  TestValidator.equals(
    "administrator list response has pagination data",
    adminList.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is valid",
    adminList.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "administrators data array exists",
    Array.isArray(adminList.data),
    true,
  );

  // Validate administrator data structure if data exists
  if (adminList.data.length > 0) {
    const admin: ITodoAppAdministrator.ISummary = adminList.data[0];

    TestValidator.equals(
      "administrator has valid ID",
      admin.id !== undefined,
      true,
    );
    TestValidator.equals(
      "administrator has email",
      admin.email !== undefined,
      true,
    );
    TestValidator.equals(
      "administrator has role_level",
      admin.role_level !== undefined,
      true,
    );
    TestValidator.equals(
      "administrator has created_at timestamp",
      admin.created_at !== undefined,
      true,
    );
  }
}
