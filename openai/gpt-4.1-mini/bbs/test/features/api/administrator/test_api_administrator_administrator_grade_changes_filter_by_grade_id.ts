import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
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

export async function test_api_administrator_administrator_grade_changes_filter_by_grade_id(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  // Use authorized join to create admin and get token
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass123!",
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  // Authorization header set internally by authorize_administrator_join
  // Compose request body to filter by specific grade ID
  const filterGradeId: string & tags.Format<"uuid"> = administrator.gradeId;
  const requestBody: IDiscussionBoardAdministratorGradeChange.IRequest = {
    discussionBoardAdministratorGradeId: filterGradeId,
    page: 1,
    limit: 10,
  };
  // Call the API with adminConnection
  const response =
    await api.functional.discussionBoard.administrator.administrator_grade_changes.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(response);
  // Validate pagination data
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    response.pagination.limit === 10,
  );
  // Validate all returned records have matching gradeId
  for (const record of response.data) {
    typia.assert(record);
    TestValidator.equals("grade ID matches", typia.assert<string>(record.grade), filterGradeId);
  }
}
