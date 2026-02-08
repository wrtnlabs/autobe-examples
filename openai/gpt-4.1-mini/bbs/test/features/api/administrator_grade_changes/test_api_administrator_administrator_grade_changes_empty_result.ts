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

export async function test_api_administrator_administrator_grade_changes_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // 2. Query with filters that have no matching records
  // Since IDiscussionBoardAdministratorGradeChange.IRequest is empty object per definition, we simulate empty filter by passing empty object
  const body: IDiscussionBoardAdministratorGradeChange.IRequest = {};
  const result: IPageIDiscussionBoardAdministratorGradeChange.ISummary =
    await api.functional.discussionBoard.administrator.administrator_grade_changes.index(
      adminConnection,
      { body },
    );
  typia.assert(result);
  // 3. Validate empty data and pagination metadata
  TestValidator.equals("data array is empty", result.data.length, 0);
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 0);
  TestValidator.equals("pagination records", result.pagination.records, 0);
  TestValidator.equals("pagination pages", result.pagination.pages, 0);
  // 4. Error tests for unauthorized access
  await TestValidator.error("access without token fails", async () => {
    await api.functional.discussionBoard.administrator.administrator_grade_changes.index(
      { host: connection.host }, // no auth
      { body: {} },
    );
  });
}
