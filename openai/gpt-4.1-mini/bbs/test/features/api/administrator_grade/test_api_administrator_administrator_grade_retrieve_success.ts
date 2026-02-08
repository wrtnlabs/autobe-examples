import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_grade_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieval of detailed information about an existing administrator grade by its UUID with valid administrator authorization.
  // 1. Administrator join and create authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Retrieve an administrator grade with a random UUID
  // Note: The DTO is empty so we only assert the returned value has correct type
  const validGradeId = typia.random<string & tags.Format<"uuid">>();
  const administratorGrade =
    await api.functional.discussionBoard.administrator.administratorGrades.at(
      adminConnection,
      { gradeId: validGradeId },
    );
  typia.assert(administratorGrade);
  // 3. Try unauthorized access (missing token) must fail
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized access", 401, async () => {
    await api.functional.discussionBoard.administrator.administratorGrades.at(
      noAuthConnection,
      { gradeId: validGradeId },
    );
  });
  // 4. Try valid but non-existing gradeId returns 404 error
  const nonExistingGradeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError("not found error", 404, async () => {
    await api.functional.discussionBoard.administrator.administratorGrades.at(
      adminConnection,
      { gradeId: nonExistingGradeId },
    );
  });
}
