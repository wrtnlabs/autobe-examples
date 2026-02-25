import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_audit_logs_create } from "../../../generate/generate_random_discussion_board_administrator_audit_logs_create";
import { prepare_random_discussion_board_audit_log } from "../../../prepare/prepare_random_discussion_board_audit_log";

export async function test_api_audit_log_retrieve_nonexistent_entry_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving an audit log entry with a non-existent UUID
  // Step 1: Administrator registration and authorization
  const adminAuthConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminAuthConnection,
    {
      body: {
        email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "P@ssw0rd!2024",
      },
    },
  );
  typia.assert(adminAuthorized);
  // Create new connection with admin auth token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Step 2: Create an audit log entry as context (though not directly used below)
  const auditLogEntry =
    await generate_random_discussion_board_administrator_audit_logs_create(
      adminConnection,
      {
        body: {
          event_type: "test_event",
          event_description: "test event for context",
        },
      },
    );
  typia.assert(auditLogEntry);
  // Step 3: Attempt to fetch a non-existent audit log
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 not found on non-existent audit log",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.auditLogs.atAuditLog(
        adminConnection,
        { id: nonExistentUUID },
      );
    },
  );
}
