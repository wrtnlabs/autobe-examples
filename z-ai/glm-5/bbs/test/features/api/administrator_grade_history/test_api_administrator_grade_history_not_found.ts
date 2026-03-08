import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorGradeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_administrator_grade_history_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate as administrator using utility function
  await authorize_admin_join(adminConnection, {});
  // 3. Generate a random UUID for a non-existent grade history record
  const nonExistentHistoryId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to fetch the non-existent grade history and verify 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent grade history",
    404,
    async () => {
      await api.functional.discussionBoard.admin.administrator_grade_histories.at(
        adminConnection,
        {
          administratorGradeHistoryId: nonExistentHistoryId,
        },
      );
    },
  );
}
