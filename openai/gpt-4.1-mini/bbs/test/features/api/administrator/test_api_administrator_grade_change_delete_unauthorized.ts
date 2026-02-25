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

export async function test_api_administrator_grade_change_delete_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Attempt to delete an administrator grade change without authorization.
  // Use a fresh connection without any authentication headers.
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID for gradeChangeId
  const gradeChangeId = typia.random<string & tags.Format<"uuid">>();
  // Expect the API call to fail with 401 or 403 error.
  await TestValidator.httpError(
    "unauthorized delete should fail with 401 or 403",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.administrator_grade_changes.erase(
        unauthorizedConnection,
        { gradeChangeId },
      );
    },
  );
}
