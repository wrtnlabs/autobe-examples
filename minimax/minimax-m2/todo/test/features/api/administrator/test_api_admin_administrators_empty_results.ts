import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdministrator";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test administrator list retrieval when no administrators exist in the system.
 *
 * This test validates the proper handling of empty results for the
 * administrator listing endpoint. It ensures that when no administrator records
 * exist in the system, the API returns a properly structured response with
 * correct pagination metadata rather than throwing errors or returning
 * malformed data.
 *
 * The test follows this workflow:
 *
 * 1. Create a fresh administrator account to establish authentication context
 * 2. Authenticate and obtain JWT tokens for admin-level access
 * 3. Retrieve the administrator list to test empty state handling
 * 4. Validate response structure and pagination metadata for empty results
 *
 * This scenario is critical for testing edge cases where no data exists,
 * ensuring the frontend can properly handle empty states with appropriate
 * messaging and pagination controls.
 */
export async function test_api_admin_administrators_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create a fresh administrator account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "SecureAdmin123!";

  const newAdmin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(newAdmin);

  // Step 2: Verify admin account was created successfully
  TestValidator.equals(
    "admin account created successfully",
    newAdmin.id !== null && newAdmin.id !== undefined,
    true,
  );
  TestValidator.equals(
    "admin token access exists",
    newAdmin.token.access !== null && newAdmin.token.access !== undefined,
    true,
  );
  TestValidator.equals(
    "admin token refresh exists",
    newAdmin.token.refresh !== null && newAdmin.token.refresh !== undefined,
    true,
  );

  // Step 3: Retrieve administrator list (expecting empty results)
  const administratorList: IPageITodoAppAdministrator.ISummary =
    await api.functional.todoApp.admin.administrators.at(connection);
  typia.assert(administratorList);

  // Step 4: Validate empty results response structure
  TestValidator.equals(
    "administrator list response structure",
    administratorList.data instanceof Array,
    true,
  );
  TestValidator.equals("data array is empty", administratorList.data.length, 0);

  // Step 5: Validate pagination metadata for empty results
  const pagination = administratorList.pagination;
  TestValidator.equals("current page is 0", pagination.current, 0);
  TestValidator.equals("limit is non-negative", pagination.limit >= 0, true);
  TestValidator.equals("total records is 0", pagination.records, 0);
  TestValidator.equals("total pages is 0", pagination.pages, 0);

  // Step 6: Validate that pagination metadata types are correct
  TestValidator.predicate(
    "pagination.current is valid int32",
    typeof pagination.current === "number" && pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is valid int32",
    typeof pagination.limit === "number" && pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is valid int32",
    typeof pagination.records === "number" && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is valid int32",
    typeof pagination.pages === "number" && pagination.pages >= 0,
  );

  // Step 7: Verify no unexpected properties or null values
  TestValidator.predicate(
    "pagination object is well-formed",
    pagination.current !== null &&
      pagination.limit !== null &&
      pagination.records !== null &&
      pagination.pages !== null,
  );
  TestValidator.predicate(
    "data array is properly initialized",
    administratorList.data !== null && administratorList.data !== undefined,
  );
}
