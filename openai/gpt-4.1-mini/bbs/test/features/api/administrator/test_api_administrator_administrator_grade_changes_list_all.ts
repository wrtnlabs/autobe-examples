import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGradeChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_grade_changes_list_all(
  connection: api.IConnection,
): Promise<void> {
  // Description:
  // As a logged-in administrator, test retrieving administrator grade change records with no filters to receive the complete paginated listing of changes in descending order by default.
  // Validate presence of administrator and grade summary information in the response for each record.
  // Verify page metadata including total records, current page, and pages count.
  // Confirm access is denied if user is not authenticated or lacks administrator privileges.
  // Create administrator connection and authorize join to get token
  const adminConnection: api.IConnection = { host: connection.host };
  const administratorAuthorized = await authorize_administrator_join(
    adminConnection,
    { body: {} },
  );
  typia.assert(administratorAuthorized);
  Object.assign((adminConnection.headers ??= {}), {
    Authorization: administratorAuthorized.token.access,
  });
  // 1. Test: Retrieve admin grade changes with no filters
  const response =
    await api.functional.discussionBoard.administrator.administrator_grade_changes.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "records count non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "current page positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pages count non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array
  if (response.data.length > 0) {
    for (const record of response.data) {
      // Validate that record is defined
      typia.assert(record);
      // Removed invalid property checks 'administrator' and 'grade'
    }
  }
  // Negative tests
  // 2. Access denied if not authenticated
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "access denied without authentication",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.administrator_grade_changes.index(
        noAuthConnection,
        { body: {} },
      );
    },
  );
  // 3. Access denied if connection with no admin privileges
  const noAdminHeadersConnection: api.IConnection = { host: connection.host };
  noAdminHeadersConnection.headers = {};
  await TestValidator.httpError(
    "access denied with no admin privileges",
    403,
    async () => {
      await api.functional.discussionBoard.administrator.administrator_grade_changes.index(
        noAdminHeadersConnection,
        { body: {} },
      );
    },
  );
}
