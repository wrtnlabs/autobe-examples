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

export async function test_api_audit_log_retrieve_existing_entry_as_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a detailed audit log entry by a valid UUID as an authenticated administrator.
  // Steps:
  // - Authenticate as a new administrator via /auth/administrator/join
  // - Create a new audit log entry via POST /discussionBoard/administrator/auditLogs with valid eventType and eventDescription
  // - Retrieve the created audit log using GET /discussionBoard/administrator/auditLogs/{id} with the returned UUID
  // - Validate the response contains all audit log properties with accurate values
  // - Confirm actor summary information matches the authenticated administrator
  // - Confirm timestamps are valid and formatted properly
  // - Confirm status code 200 is returned
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "strongpassword123",
    },
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 2. Create a new audit log entry related to this administrator
  const auditLogCreateBody: IDiscussionBoardAuditLog.ICreate = {
    event_type: "login",
    event_description: "Administrator login event for testing",
    actor_id: adminAuthorized.id,
  };
  const createdAuditLog =
    await generate_random_discussion_board_administrator_audit_logs_create(
      adminConnection,
      { body: auditLogCreateBody },
    );
  typia.assert(createdAuditLog);
  // 3. Retrieve the created audit log by id
  const retrievedAuditLog =
    await api.functional.discussionBoard.administrator.auditLogs.atAuditLog(
      adminConnection,
      { id: createdAuditLog.id },
    );
  typia.assert(retrievedAuditLog);
  // 4. Validate the audit log fields
  TestValidator.equals(
    "audit log id",
    retrievedAuditLog.id,
    createdAuditLog.id,
  );
  TestValidator.equals(
    "event type",
    retrievedAuditLog.eventType,
    auditLogCreateBody.event_type,
  );
  TestValidator.equals(
    "event description",
    retrievedAuditLog.eventDescription,
    auditLogCreateBody.event_description,
  );
  TestValidator.equals(
    "actor id",
    retrievedAuditLog.actorId,
    adminAuthorized.id,
  );
  // 5. Confirm actor summary matches authenticated administrator
  if (
    retrievedAuditLog.actor !== undefined &&
    retrievedAuditLog.actor !== null
  ) {
    TestValidator.equals(
      "actor summary id",
      retrievedAuditLog.actor.id,
      adminAuthorized.id,
    );
    TestValidator.equals(
      "actor summary email",
      retrievedAuditLog.actor.email,
      adminAuthorized.email,
    );
  } else {
    throw new Error("Actor summary is missing in retrieved audit log");
  }
  // 6. Confirm timestamps are valid ISO date-time strings
  const timestamps = [retrievedAuditLog.createdAt, retrievedAuditLog.updatedAt];
  for (const time of timestamps) {
    TestValidator.predicate(
      "timestamp format",
      /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])[T ]([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?(Z|[+-][01]\d:[0-5]\d)$/.test(
        time.replace(/\s/, "T"),
      ),
    );
  }
  // 7. deletedAt can be null or datetime string
  if (retrievedAuditLog.deletedAt !== null) {
    TestValidator.predicate(
      "deletedAt format",
      /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])[T ]([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?(Z|[+-][01]\d:[0-5]\d)$/.test(
        retrievedAuditLog.deletedAt.replace(/\s/, "T"),
      ),
    );
  }
}
