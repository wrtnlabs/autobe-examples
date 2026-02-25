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

export async function test_api_super_administrator_audit_log_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new connection object for super administrator and join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdminAuthorized);
  superAdminConnection.headers = {
    Authorization: superAdminAuthorized.token.access,
  };
  // 2. Prepare audit log creation body with required fields
  const body: IDiscussionBoardAuditLog.ICreate = {
    event_type: RandomGenerator.alphabets(10) || "audit_event",
    event_description:
      RandomGenerator.paragraph({ sentences: 2 }) || "Audit event description",
    actor_id: superAdminAuthorized.id,
  };
  // 3. Create audit log using generation utility function
  const auditLog =
    await generate_random_discussion_board_super_administrator_audit_logs_create(
      superAdminConnection,
      {
        body,
      },
    );
  // 4. Assert the created audit log is valid and fields are correctly populated
  typia.assert(auditLog);
  // 5. Validate that required fields are non-empty
  TestValidator.predicate(
    "event_type is non-empty",
    auditLog.eventType.length > 0,
  );
  TestValidator.predicate(
    "event_description is non-empty",
    auditLog.eventDescription.length > 0,
  );
  // 6. Validate optional actorId matches input or null
  if (body.actor_id !== null && body.actor_id !== undefined) {
    TestValidator.equals("actor_id matches", auditLog.actorId, body.actor_id);
  }
  // 7. Validate timestamps are valid date-time strings
  TestValidator.predicate(
    "createdAt is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(auditLog.createdAt),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(auditLog.updatedAt),
  );
  TestValidator.predicate(
    "deletedAt is null or ISO date-time",
    auditLog.deletedAt === null ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        auditLog.deletedAt ?? "",
      ),
  );
  // 8. Confirm the audit log can be retrieved by id (not in given APIs, so omitted)
}
