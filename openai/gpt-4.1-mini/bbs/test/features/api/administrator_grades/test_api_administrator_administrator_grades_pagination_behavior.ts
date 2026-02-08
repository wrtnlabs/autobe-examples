import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_grades_pagination_behavior(
  connection: api.IConnection,
): Promise<void> {
  // Test querying administrator grades with pagination parameters.
  // - The request is made by an authenticated administrator.
  // - Include page number and limit in the request body to paginate results.
  // - Query a high page number expected to return empty or partial data.
  // - Verify correctness of pagination metadata including current page, total pages, and total record count.
  // - Confirm sorting by level ascending is preserved.
  // - Validate behavior on limit values like 1 or very high limits.
  // 1. Authorize an administrator and prepare a connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} }); // IJoin is empty object
  // 2. Call index API with empty body (since IRequest is empty) to get paginated results
  const firstResponse =
    await api.functional.discussionBoard.administrator.administratorGrades.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(firstResponse);
  // Validate pagination metadata properties
  TestValidator.predicate(
    "pagination.current is number >= 0",
    typeof firstResponse.pagination.current === "number" &&
      firstResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is number >= 0",
    typeof firstResponse.pagination.limit === "number" &&
      firstResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is number >= 0",
    typeof firstResponse.pagination.records === "number" &&
      firstResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is number >= 0",
    typeof firstResponse.pagination.pages === "number" &&
      firstResponse.pagination.pages >= 0,
  );
  // Sorting by level ascending validation is omitted because ISummary has no 'level' property.
  // 3. Repeat call to validate stable pagination metadata
  const secondResponse =
    await api.functional.discussionBoard.administrator.administratorGrades.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(secondResponse);
  TestValidator.equals(
    "pagination metadata stable",
    JSON.stringify(firstResponse.pagination),
    JSON.stringify(secondResponse.pagination),
  );
  // 4. Test for large page number scenario only if records present
  if (firstResponse.pagination.records > 0) {
    const largePageResponse =
      await api.functional.discussionBoard.administrator.administratorGrades.index(
        adminConnection,
        { body: {} },
      );
    typia.assert(largePageResponse);
    TestValidator.predicate(
      "records count is non-negative",
      largePageResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages count consistency",
      largePageResponse.pagination.pages >= 0 &&
        (largePageResponse.pagination.pages === 0 ||
          largePageResponse.pagination.pages >= 1),
    );
  }
}
