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
import { generate_random_discussion_board_super_administrator_audit_logs_create } from "../../../generate/generate_random_discussion_board_super_administrator_audit_logs_create";
import { prepare_random_discussion_board_audit_log } from "../../../prepare/prepare_random_discussion_board_audit_log";

export async function test_api_super_administrator_audit_log_creation_without_actor(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator join to get authorized connection for audit log creation
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongP@ssw0rd!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  superAdminConnection.headers = { Authorization: superAdmin.token.access };
  // 2. Prepare audit log creation body with null actor_id
  const auditLogCreateBody: IDiscussionBoardAuditLog.ICreate = {
    event_type: "system_event",
    event_description: "System generated audit log entry without actor",
    actor_id: null,
  };
  // 3. Create audit log entry using the super administrator authorized connection
  const auditLog =
    await generate_random_discussion_board_super_administrator_audit_logs_create(
      superAdminConnection,
      {
        body: auditLogCreateBody,
      },
    );
  typia.assert(auditLog);
  // 4. Validate basic fields
  TestValidator.equals(
    "audit log event_type",
    auditLog.eventType,
    auditLogCreateBody.event_type,
  );
  TestValidator.equals(
    "audit log event_description",
    auditLog.eventDescription,
    auditLogCreateBody.event_description,
  );
  TestValidator.equals("audit log actor_id", auditLog.actorId, null);
  // 5. Confirm the actor property is null or undefined since actor_id is null
  TestValidator.predicate(
    "audit log actor is null or undefined",
    auditLog.actor === null || auditLog.actor === undefined,
  );
  // 6. Confirm timestamps are valid ISO date-time strings
  const createdAtValid =
    typeof auditLog.createdAt === "string" &&
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.+-Z]+$/.test(auditLog.createdAt);
  const updatedAtValid =
    typeof auditLog.updatedAt === "string" &&
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.+-Z]+$/.test(auditLog.updatedAt);
  TestValidator.predicate(
    "audit log createdAt is ISO date-time string",
    createdAtValid,
  );
  TestValidator.predicate(
    "audit log updatedAt is ISO date-time string",
    updatedAtValid,
  );
  // 7. deletedAt must be null on newly created log
  TestValidator.equals("audit log deletedAt is null", auditLog.deletedAt, null);
}
