import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
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

export async function test_api_audit_log_update_by_super_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator joins (registers) to get authorized connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "strongpassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(authorized);
  // Use authorized connection for subsequent API calls
  superAdminConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Prepare update data with boundary tests (timestamps changed and description changed)
  const updateBody: IDiscussionBoardAuditLog.IUpdate = {
    eventType: "updatedEvent",
    eventDescription: "Updated audit log entry description",
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day earlier
    updatedAt: new Date().toISOString(), // now
    deletedAt: null,
  };
  // 3. Generate a random audit log UUID Id for update test
  //    Since no creation endpoint exists, assume test environment allows update with random UUID
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt update with authorized superAdmin
  const updatedAuditLog =
    await api.functional.discussionBoard.superAdministrator.auditLogs.update(
      superAdminConnection,
      {
        id: auditLogId,
        body: updateBody,
      },
    );
  typia.assert(updatedAuditLog);
  // Validate fields
  TestValidator.equals(
    "eventType should be updated",
    updatedAuditLog.eventType,
    updateBody.eventType,
  );
  TestValidator.equals(
    "eventDescription should be updated",
    updatedAuditLog.eventDescription,
    updateBody.eventDescription,
  );
  TestValidator.equals(
    "createdAt should be updated",
    updatedAuditLog.createdAt,
    updateBody.createdAt,
  );
  TestValidator.equals(
    "updatedAt should be updated",
    updatedAuditLog.updatedAt,
    updateBody.updatedAt,
  );
  TestValidator.equals(
    "deletedAt should be updated",
    updatedAuditLog.deletedAt,
    updateBody.deletedAt,
  );
}
