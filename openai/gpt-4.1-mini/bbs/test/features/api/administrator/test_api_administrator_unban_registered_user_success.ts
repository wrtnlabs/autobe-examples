import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_unban_registered_user_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins (registers)
  const adminConnection: api.IConnection = { host: connection.host };
  const administratorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
  } satisfies IDiscussionBoardAdministrator.IJoin;
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: administratorJoinBody,
  });
  typia.assert(authorizedAdmin);
  // 2. Use authorized admin connection for unban operations
  const adminAuthConnection: api.IConnection = { host: connection.host };
  adminAuthConnection.headers = { Authorization: authorizedAdmin.token.access };
  // 3. We need a registeredUserId for unbanning, simulate that here
  // Since we do not have ban creation API or user creation API, generate a valid UUID to act as banned user id
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();
  // 4. Call unban API
  const unbanResponse =
    await api.functional.discussionBoard.administrator.administrator.unban(
      adminAuthConnection,
      { registeredUserId },
    );
  typia.assert(unbanResponse);
  // 5. Validate response success
  TestValidator.predicate(
    "unban operation success",
    unbanResponse.success === true,
  );
  // 6. Confirm that the unbanned user can login afterwards
  // Since no user login API is provided, assume this step is conceptual
  // (If login API existed, would perform login and verify tokens)
  // 7. Confirm audit log entry exists for the unban action
  // Since no audit log API is provided, this is conceptual and cannot be tested here
}
