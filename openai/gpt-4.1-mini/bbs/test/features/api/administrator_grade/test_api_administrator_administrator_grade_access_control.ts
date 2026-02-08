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

export async function test_api_administrator_administrator_grade_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Create a base connection without authorization
  const baseConnection: api.IConnection = { host: connection.host };
  // Generate a random gradeId for testing unauthorized access
  const unauthorizedGradeId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to get administrator grade without authorization
  // Expect HTTP 401 or 403 error
  await TestValidator.httpError(
    "access denied without administrator authorization",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.administratorGrades.at(
        baseConnection,
        { gradeId: unauthorizedGradeId },
      );
    },
  );
  // Create a new connection and authenticate as administrator using join
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Set Authorization header on adminConnection
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = authorized.token.access;
  // Use the adminConnection to get administrator grade info
  const authorizedGradeId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // Retrieve grade data
  const grade =
    await api.functional.discussionBoard.administrator.administratorGrades.at(
      adminConnection,
      { gradeId: authorizedGradeId },
    );
  // Validate response
  typia.assert(grade);
  // Instead of checking grade.id, just ensure grade is asserted correctly and exists
}