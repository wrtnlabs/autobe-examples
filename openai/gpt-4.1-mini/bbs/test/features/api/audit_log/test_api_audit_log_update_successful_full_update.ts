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

export async function test_api_audit_log_update_successful_full_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
    },
  });
  typia.assert(administrator);
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: administrator.token.access,
  };
  // 2. Create a new audit log entry
  const createdAuditLog =
    await generate_random_discussion_board_administrator_audit_logs_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(createdAuditLog);
  // 3. Prepare a full update payload for audit log
  const updatedPayload: IDiscussionBoardAuditLog.IUpdate = {
    eventType: RandomGenerator.name(),
    eventDescription: RandomGenerator.paragraph({ sentences: 3 }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };
  // 4. Update the audit log entry
  const updatedAuditLog =
    await api.functional.discussionBoard.administrator.auditLogs.update(
      adminConnection,
      {
        id: createdAuditLog.id,
        body: updatedPayload,
      },
    );
  typia.assert(updatedAuditLog);
  // 5. Assertions
  TestValidator.equals(
    "audit log ID should remain the same",
    updatedAuditLog.id,
    createdAuditLog.id,
  );
  TestValidator.equals(
    "eventType should be updated",
    updatedAuditLog.eventType,
    updatedPayload.eventType,
  );
  TestValidator.equals(
    "eventDescription should be updated",
    updatedAuditLog.eventDescription,
    updatedPayload.eventDescription,
  );
  TestValidator.equals(
    "createdAt should be updated",
    updatedAuditLog.createdAt,
    updatedPayload.createdAt,
  );
  TestValidator.equals(
    "updatedAt should be updated",
    updatedAuditLog.updatedAt,
    updatedPayload.updatedAt,
  );
  TestValidator.equals(
    "deletedAt should be updated",
    updatedAuditLog.deletedAt,
    updatedPayload.deletedAt,
  );
}
