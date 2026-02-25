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

export async function test_api_audit_log_create_with_actor_and_system_event(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful creation of a new audit log entry by an authenticated administrator.
  // 1. Authenticate administrator by joining
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: "P@ssw0rd!",
    },
  });
  typia.assert(administrator);
  // 2. Prepare audit log create body with valid actor_id referencing the administrator
  const bodyWithActor: IDiscussionBoardAuditLog.ICreate = {
    event_type: "user_login",
    event_description: "Administrator logged in successfully.",
    actor_id: administrator.id,
  };
  // 3. Create audit log entry with actor
  const auditLogWithActor =
    await generate_random_discussion_board_administrator_audit_logs_create(
      adminConnection,
      {
        body: bodyWithActor,
      },
    );
  typia.assert(auditLogWithActor);
  // Validate response fields
  TestValidator.predicate(
    "audit log id format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      auditLogWithActor.id,
    ),
  );
  TestValidator.equals(
    "event type",
    auditLogWithActor.eventType,
    bodyWithActor.event_type,
  );
  TestValidator.equals(
    "event description",
    auditLogWithActor.eventDescription,
    bodyWithActor.event_description,
  );
  TestValidator.equals(
    "actor id",
    auditLogWithActor.actorId,
    bodyWithActor.actor_id,
  );
  // Scenario 2: Creation of audit log entry with null actor_id to represent system-initiated event.
  // 4. Prepare audit log create body with null actor_id
  const bodySystemEvent: IDiscussionBoardAuditLog.ICreate = {
    event_type: "system_maintenance",
    event_description: "System performed scheduled maintenance.",
    actor_id: null,
  };
  // 5. Create audit log entry with null actor_id
  const auditLogSystem =
    await generate_random_discussion_board_administrator_audit_logs_create(
      adminConnection,
      {
        body: bodySystemEvent,
      },
    );
  typia.assert(auditLogSystem);
  // Validate response fields for system event
  TestValidator.predicate(
    "audit log system event id format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      auditLogSystem.id,
    ),
  );
  TestValidator.equals(
    "event type (system)",
    auditLogSystem.eventType,
    bodySystemEvent.event_type,
  );
  TestValidator.equals(
    "event description (system)",
    auditLogSystem.eventDescription,
    bodySystemEvent.event_description,
  );
  TestValidator.equals("actor id (system)", auditLogSystem.actorId, null);
}
