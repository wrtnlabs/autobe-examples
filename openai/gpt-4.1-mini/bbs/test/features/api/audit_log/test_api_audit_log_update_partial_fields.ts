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

export async function test_api_audit_log_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPassword123!",
    },
  });
  typia.assert(adminAuth);
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // Create a new audit log entry before update
  const originalAuditLog =
    await generate_random_discussion_board_administrator_audit_logs_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(originalAuditLog);
  // Prepare partial update with only eventType and eventDescription
  const newEventType = originalAuditLog.eventType + "_updated";
  const newEventDescription =
    originalAuditLog.eventDescription + " updated description";
  const updateBody: IDiscussionBoardAuditLog.IUpdate = {
    eventType: newEventType,
    eventDescription: newEventDescription,
  };
  // Perform the update call
  const updatedAuditLog =
    await api.functional.discussionBoard.administrator.auditLogs.update(
      adminConnection,
      {
        id: originalAuditLog.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAuditLog);
  // Validate that only updated fields changed and timestamps are preserved
  TestValidator.equals(
    "eventType updated",
    updatedAuditLog.eventType,
    newEventType,
  );
  TestValidator.equals(
    "eventDescription updated",
    updatedAuditLog.eventDescription,
    newEventDescription,
  );
  TestValidator.equals(
    "createdAt preserved",
    updatedAuditLog.createdAt,
    originalAuditLog.createdAt,
  );
  TestValidator.equals(
    "updatedAt preserved",
    updatedAuditLog.updatedAt,
    originalAuditLog.updatedAt,
  );
  TestValidator.equals(
    "deletedAt preserved",
    updatedAuditLog.deletedAt,
    originalAuditLog.deletedAt,
  );
  TestValidator.equals("id preserved", updatedAuditLog.id, originalAuditLog.id);
  TestValidator.equals(
    "actorId preserved",
    updatedAuditLog.actorId,
    originalAuditLog.actorId,
  );
  TestValidator.equals(
    "actor preserved",
    updatedAuditLog.actor,
    originalAuditLog.actor,
  );
}
