import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGradeChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_administrator_grade_changes_filter_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new super administrator account and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinOutput = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdminJoinOutput);
  // new connection with authorization header set by join function
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization =
    superAdminJoinOutput.token.access;
  // Compose filter parameters for administrator grade changes
  const filterBody: IDiscussionBoardAdministratorGradeChange.IRequest = {
    discussionBoardAdministratorId: superAdminJoinOutput.id,
    discussionBoardAdministratorGradeId: undefined,
    createdAtFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAtTo: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAtFrom: undefined,
    updatedAtTo: undefined,
    page: 1,
    limit: 10,
  };
  // 2. Retrieve administrator grade changes with filter
  const gradeChangePage =
    await api.functional.discussionBoard.superAdministrator.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: filterBody,
      },
    );
  typia.assert(gradeChangePage);
  // Basic validation of pagination and data
  if (gradeChangePage.pagination.current !== (filterBody.page ?? 1))
    throw new Error("Pagination current page mismatch");
  if (gradeChangePage.pagination.limit !== (filterBody.limit ?? 10))
    throw new Error("Pagination limit mismatch");
  if (!(gradeChangePage.data instanceof Array))
    throw new Error("Data is not an array");
  // Validate each grade change record
  for (const record of gradeChangePage.data) {
    typia.assert(record);
    // Verify that administrator exists and matches filter if specified
    if (filterBody.discussionBoardAdministratorId !== undefined) {
      if (record.administrator.id !== filterBody.discussionBoardAdministratorId)
        throw new Error("Administrator ID mismatch");
    }
    // If grade id filter specified, validate
    if (filterBody.discussionBoardAdministratorGradeId !== undefined) {
      if (record.grade === undefined) throw new Error("Grade undefined");
    }
    // created_at within filter range
    if (
      new Date(record.created_at).getTime() <
      new Date(filterBody.createdAtFrom!).getTime()
    )
      throw new Error("Created_at is before filterFrom");
    if (
      new Date(record.created_at).getTime() >
      new Date(filterBody.createdAtTo!).getTime()
    )
      throw new Error("Created_at is after filterTo");
  }
  // 3. Confirm unauthorized access is forbidden
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.discussionBoard.superAdministrator.administrator_grade_changes.index(
      unauthorizedConnection,
      { body: {} },
    );
  });
}
