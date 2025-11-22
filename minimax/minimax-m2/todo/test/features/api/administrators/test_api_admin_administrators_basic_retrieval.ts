import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdministrator";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

export async function test_api_admin_administrators_basic_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create admin user for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: RandomGenerator.alphabets(16),
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Retrieve administrator list with default pagination
  const administratorsPage: IPageITodoAppAdministrator.ISummary =
    await api.functional.todoApp.admin.administrators.at(connection);
  typia.assert(administratorsPage);

  // Step 3: Validate pagination structure
  TestValidator.equals(
    "pagination structure exists",
    administratorsPage.pagination,
    administratorsPage.pagination,
  );
  TestValidator.equals(
    "pagination has current page",
    administratorsPage.pagination.current,
    administratorsPage.pagination.current,
  );
  TestValidator.equals(
    "pagination has limit",
    administratorsPage.pagination.limit,
    administratorsPage.pagination.limit,
  );
  TestValidator.equals(
    "pagination has records count",
    administratorsPage.pagination.records,
    administratorsPage.pagination.records,
  );
  TestValidator.equals(
    "pagination has pages count",
    administratorsPage.pagination.pages,
    administratorsPage.pagination.pages,
  );

  // Step 4: Validate administrator list structure
  TestValidator.equals(
    "administrators data is array",
    administratorsPage.data,
    administratorsPage.data,
  );
  TestValidator.predicate(
    "administrators list is not empty",
    administratorsPage.data.length > 0,
  );

  // Step 5: Validate administrator summary structure
  const firstAdmin = administratorsPage.data[0];
  TestValidator.equals("admin has UUID id", firstAdmin.id, firstAdmin.id);
  TestValidator.equals("admin has email", firstAdmin.email, firstAdmin.email);
  TestValidator.equals(
    "admin has first name",
    firstAdmin.first_name,
    firstAdmin.first_name,
  );
  TestValidator.equals(
    "admin has last name",
    firstAdmin.last_name,
    firstAdmin.last_name,
  );
  TestValidator.equals(
    "admin has role level",
    firstAdmin.role_level,
    firstAdmin.role_level,
  );
  TestValidator.equals(
    "admin has creation timestamp",
    firstAdmin.created_at,
    firstAdmin.created_at,
  );

  // Step 6: Validate role level and timestamp formats
  TestValidator.predicate(
    "role level is valid",
    ["super_admin", "admin", "moderator"].includes(firstAdmin.role_level),
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(firstAdmin.created_at),
  );

  // Step 7: Validate email format for all administrators
  administratorsPage.data.forEach((admin, index) => {
    TestValidator.predicate(
      `admin ${index} email is valid`,
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email),
    );
  });

  // Step 8: Validate that created admin appears in the list
  const createdAdminInList = administratorsPage.data.find(
    (admin) => admin.email === adminEmail,
  );
  TestValidator.predicate(
    "created admin appears in list",
    !!createdAdminInList,
  );

  if (createdAdminInList) {
    TestValidator.equals(
      "created admin has correct role",
      createdAdminInList.role_level,
      "admin",
    );
    TestValidator.equals(
      "created admin has correct name",
      createdAdminInList.first_name,
      firstAdmin.first_name,
    );
  }
}
