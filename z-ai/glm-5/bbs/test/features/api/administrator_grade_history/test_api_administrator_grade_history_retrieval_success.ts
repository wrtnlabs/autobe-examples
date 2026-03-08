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

export async function test_api_administrator_grade_history_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Retrieve a specific administrator grade history record
  const historyId = typia.random<string & tags.Format<"uuid">>();
  const history: IDiscussionBoardAdministratorGradeHistory =
    await api.functional.discussionBoard.admin.administrator_grade_histories.at(
      adminConnection,
      {
        administratorGradeHistoryId: historyId,
      },
    );
  // 3. Validate the complete response structure
  typia.assert(history);
  // 4. Validate business rules: action matches grade transition
  if (history.action === "promotion") {
    TestValidator.equals(
      "promotion: previous_grade should be regular",
      history.previous_grade,
      "regular",
    );
    TestValidator.equals(
      "promotion: new_grade should be super",
      history.new_grade,
      "super",
    );
  } else {
    TestValidator.equals(
      "demotion: previous_grade should be super",
      history.previous_grade,
      "super",
    );
    TestValidator.equals(
      "demotion: new_grade should be regular",
      history.new_grade,
      "regular",
    );
  }
  // 5. Validate that previous_grade and new_grade are different
  TestValidator.notEquals(
    "previous_grade and new_grade should differ",
    history.previous_grade,
    history.new_grade,
  );
}
