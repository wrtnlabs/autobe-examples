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

export async function test_api_administrator_audit_log_deletion_authorization_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion by authorized administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IDiscussionBoardAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1234",
  };
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(authorizedAdmin);
  // Use adminConnection with token
  Object.assign(adminConnection, {
    headers: { Authorization: `Bearer ${authorizedAdmin.token.access}` },
  });
  // For testing delete an existing audit log, create a new audit log if API for creation existed
  // Since audit log creation API is not given, we use a random UUID which may not exist
  // Instead, test deletion handling with this non-existent UUID to cover Scenario 2
  // Scenario 2: Attempt to delete non-existent audit log
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent audit log should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.auditLogs.eraseAuditLog(
        adminConnection,
        { id: nonExistentId },
      );
    },
  );
  // Scenario 3: Unauthorized user attempts to delete audit log entry
  const userConnection: api.IConnection = { host: connection.host };
  // No authorization header set to simulate unauthorized user
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized user should not delete audit log",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.auditLogs.eraseAuditLog(
        userConnection,
        { id: randomId },
      );
    },
  );
}
