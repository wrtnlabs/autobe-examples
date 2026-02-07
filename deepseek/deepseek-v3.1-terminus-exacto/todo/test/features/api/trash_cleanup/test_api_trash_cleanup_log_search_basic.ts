import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTrashCleanupLog";
import type { ITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashCleanupLog";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test basic search functionality for trash cleanup logs.
 *
 * This test verifies that authenticated users can search cleanup logs with default pagination.
 * It tests empty result set handling when no cleanup operations have occurred and validates
 * pagination metadata includes correct total records and page calculations.
 */
export async function test_api_trash_cleanup_log_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  // Test basic search with default pagination
  const response = await api.functional.todoApp.user.trash.cleanup_logs.index(
    userConnection,
    {
      body: {
        // Empty search criteria to test default behavior
      } satisfies ITodoAppTrashCleanupLog.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination metadata (business logic, not type validation)
  TestValidator.predicate(
    "current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "default limit is 20",
    response.pagination.limit === 20,
  );
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate each cleanup log summary if present
  for (const log of response.data) {
    typia.assert(log);
    // Validate business logic constraints (not type validation)
    TestValidator.predicate(
      "items_processed is non-negative",
      log.items_processed >= 0,
    );
    TestValidator.predicate(
      "items_deleted is non-negative",
      log.items_deleted >= 0,
    );
    TestValidator.predicate(
      "items_deleted <= items_processed",
      log.items_deleted <= log.items_processed,
    );
  }
  // Validate pagination calculations
  if (response.pagination.records > 0) {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation",
      response.pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals(
      "zero records has zero pages",
      response.pagination.pages,
      0,
    );
  }
  // Test with specific search criteria
  const specificResponse =
    await api.functional.todoApp.user.trash.cleanup_logs.index(userConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTrashCleanupLog.IRequest,
    });
  typia.assert(specificResponse);
  // Validate custom pagination settings
  TestValidator.equals(
    "custom page setting",
    specificResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit setting",
    specificResponse.pagination.limit,
    10,
  );
}
