import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_grade_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Deleting a non-existent administrator grade returns 404 Not Found.
  // 1) A super administrator joins the system (admin registration).
  // 2) The super administrator attempts to delete an administrator grade with a non-existent UUID.
  // Validation: The response status is 404 Not Found. The system correctly handles missing grades without errors or side effects.
  // 1. A super administrator joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. The super administrator attempts to delete an administrator grade with a non-existent UUID
  const fakeGradeId = typia.random<string & tags.Format<"uuid">>();
  // The call is expected to throw HttpError with status 404
  await TestValidator.httpError(
    "delete non-existent administrator grade should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.administratorGrades.erase(
        adminConnection,
        { gradeId: fakeGradeId },
      );
    },
  );
}
