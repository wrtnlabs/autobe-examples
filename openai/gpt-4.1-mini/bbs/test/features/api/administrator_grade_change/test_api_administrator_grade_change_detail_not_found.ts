import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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

export async function test_api_administrator_grade_change_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving administrator grade change detail with a non-existent gradeChangeId UUID.
  // Expect 404 Not Found response indicating the resource does not exist.
  // Confirm only authenticated administrators can access this endpoint to prevent unauthorized access.
  // 1. Administrator join and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Join as administrator (empty body per IJoin definition)
  const authAdmin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authAdmin);
  // Set Authorization header with access token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${authAdmin.token.access}`,
  };
  // 2. Prepare non-existent gradeChangeId UUID
  const nonExistentGradeChangeId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to get administrator grade change detail with non-existent ID
  await TestValidator.httpError(
    "404 not found for non-existent administrator grade change detail",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.administrator_grade_changes.at(
        adminConnection,
        { gradeChangeId: nonExistentGradeChangeId },
      );
    },
  );
}
