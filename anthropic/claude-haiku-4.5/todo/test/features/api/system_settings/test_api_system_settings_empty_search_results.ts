import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSetting";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

export async function test_api_system_settings_empty_search_results(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
  // Create a new admin account and authenticate to get JWT tokens
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10),
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);
  TestValidator.predicate("admin authentication successful", !!admin.token);

  // Step 2: Search for non-existent setting key
  // Perform a search with criteria that should not match any existing settings
  const nonExistentKeyResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        setting_key:
          "NON_EXISTENT_SETTING_KEY_" + RandomGenerator.alphaNumeric(10),
        page: 1,
        limit: 10,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(nonExistentKeyResult);

  // Validate empty results
  TestValidator.equals(
    "empty data array for non-existent key search",
    nonExistentKeyResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is zero",
    nonExistentKeyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is zero",
    nonExistentKeyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    nonExistentKeyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    nonExistentKeyResult.pagination.limit,
    10,
  );

  // Step 3: Search with date range that has no modifications
  // Use a future date range that is unlikely to have any modified settings
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 10);
  const futureDateString = futureDate.toISOString();

  const futureRangeResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        updated_at_from: futureDateString,
        updated_at_to: futureDate.toISOString(),
        page: 1,
        limit: 20,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(futureRangeResult);

  // Validate empty results for future date range
  TestValidator.equals(
    "empty data array for future date range search",
    futureRangeResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is zero for future date range",
    futureRangeResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is zero for future date range",
    futureRangeResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current is 1 for future date range",
    futureRangeResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20 for future date range",
    futureRangeResult.pagination.limit,
    20,
  );

  // Step 4: Search with non-existent setting type
  // Search for a specific type that might not have any settings
  const nonExistentTypeResult: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.systemSettings.index(connection, {
      body: {
        setting_type: "integer",
        setting_key: "IMPOSSIBLE_SETTING_" + RandomGenerator.alphaNumeric(8),
        page: 1,
        limit: 10,
      } satisfies ITodoAppSystemSetting.IRequest,
    });
  typia.assert(nonExistentTypeResult);

  // Validate empty results for non-existent type
  TestValidator.equals(
    "empty data array for non-existent type search",
    nonExistentTypeResult.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination structure is valid for empty results",
    nonExistentTypeResult.pagination.records === 0 &&
      nonExistentTypeResult.pagination.pages === 0,
  );
}
