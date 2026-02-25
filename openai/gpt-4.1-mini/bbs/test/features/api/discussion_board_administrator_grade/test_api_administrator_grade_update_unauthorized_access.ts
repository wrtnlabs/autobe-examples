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

export async function test_api_administrator_grade_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Unauthorized user attempts to update an administrator grade
  // without superAdministrator privileges.
  // Verify the request is denied with an authorization failure.
  // Create a body payload with random update values
  const body = {
    name: "UnauthorizedUpdate" + Math.random().toString(36).slice(-5),
    description: "Attempted unauthorized update",
    level: 9999,
  } satisfies IDiscussionBoardAdministratorGrade.IUpdate;
  // Use random gradeId - this must be a valid UUID format
  const gradeId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to call the update endpoint without authorization
  await TestValidator.httpError(
    "unauthorized update attempt",
    403,
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.grades.update(
        connection,
        { gradeId, body },
      );
    },
  );
}
