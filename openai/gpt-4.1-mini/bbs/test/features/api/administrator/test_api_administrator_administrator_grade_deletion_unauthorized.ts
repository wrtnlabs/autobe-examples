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

export async function test_api_administrator_administrator_grade_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Forbidden deletion attempt by an unauthorized regular administrator.
  // Steps:
  // 1) A regular administrator joins the system (admin registration without elevated privileges).
  // 2) The regular administrator attempts to delete an administrator grade using the DELETE endpoint.
  // Validation:
  // The response status is 403 Forbidden indicating lack of authorization.
  // The grade remains intact in the system. Proper authorization checks prevent unauthorized grade deletion.
  // 1) Join as a regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 2) Attempt to delete an administrator grade using a random UUID (simulate attempt)
  const gradeId = typia.random<string & tags.Format<"uuid">>();
  // Expect a 403 Forbidden error since this admin is not authorized to delete grades
  await TestValidator.httpError(
    "forbidden deletion attempt by unauthorized regular administrator",
    403,
    async () => {
      await api.functional.discussionBoard.administrator.administratorGrades.erase(
        adminConnection,
        { gradeId },
      );
    },
  );
}
