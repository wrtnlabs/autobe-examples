import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_grade_retrieval_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Test access to administrator grade retrieval endpoint without authentication.
  // Expect failure due to lacking valid super administrator authorization token.
  // Confirm that unauthorized access is properly rejected with appropriate status code (e.g., 401 Unauthorized).
  const gradeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Create a new connection without Authorization header
  const anonymousConnection: api.IConnection = { host: connection.host };
  // Expect 401 Unauthorized error when calling the endpoint without auth
  await TestValidator.httpError(
    "unauthorized access to administrator grade retrieval",
    401,
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.grades.atAdministratorGrade(
        anonymousConnection,
        { gradeId },
      );
    },
  );
}
