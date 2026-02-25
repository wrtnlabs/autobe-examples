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

export async function test_api_administrator_grade_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator account registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
    },
  });
  typia.assert(adminAuthorized);
  // Setup authorized connection using token
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Attempt to retrieve an administrator grade with a non-existing gradeId
  const nonExistingGradeId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect 404 Not Found error when accessing non-existing grade ID
  await TestValidator.httpError(
    "administrator grade not found with invalid id",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.administrator.grades.atAdministratorGrade(
        adminConnection,
        { gradeId: nonExistingGradeId },
      );
    },
  );
}
