import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_grade_change_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator using join
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123!",
      },
    },
  );
  typia.assert(administrator);
  // Use the authenticated connection for the update attempt
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: administrator.token.access };
  // Use a non-existent UUID for gradeChangeId
  const nonExistentGradeChangeId = typia.random<string & tags.Format<"uuid">>();
  // Prepare a minimal valid update body with no actual changes
  const updateBody: IDiscussionBoardAdministratorGradeChange.IUpdate = {};
  // Expect 404 Not Found error on update
  await TestValidator.httpError(
    "gradeChange update not found",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.administrator_grade_changes.updateAdministratorGradeChange(
        adminConnection,
        {
          gradeChangeId: nonExistentGradeChangeId,
          body: updateBody,
        },
      );
    },
  );
}
