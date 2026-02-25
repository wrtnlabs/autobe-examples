import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_audit_logs_retrieve_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authorizedAdmin);
  // 2. Retrieve audit logs with default pagination (no filters)
  const auditLogsPage =
    await api.functional.discussionBoard.administrator.auditLogs.index(
      adminConnection,
      {
        body: {}, // no filter, use default pagination
      },
    );
  // 3. Validate response structure
  typia.assert(auditLogsPage);
  // 4. Validate pagination meta properties
  const pagination = auditLogsPage.pagination;
  TestValidator.predicate(
    "current page number is >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("limit is > 0", pagination.limit > 0);
  TestValidator.predicate("records count is >= 0", pagination.records >= 0);
  TestValidator.predicate("pages is >= 0", pagination.pages >= 0);
  TestValidator.predicate(
    "pages matches records and limit",
    pagination.pages ===
      (pagination.records === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit)),
  );
  // 5. Validate audit logs data array
  const data = auditLogsPage.data;
  TestValidator.predicate("audit logs data is an array", Array.isArray(data));
  // 6. Validate each audit log summary
  for (const log of data) {
    typia.assert(log); // validate entire structure
    TestValidator.predicate(
      "audit log has valid eventType string",
      typeof log.eventType === "string" && log.eventType.length > 0,
    );
    TestValidator.predicate(
      "audit log has valid eventDescription string",
      typeof log.eventDescription === "string" &&
        log.eventDescription.length > 0,
    );
    TestValidator.predicate(
      "audit log has valid timestamps",
      !!log.createdAt && !!log.updatedAt,
    );
    // Validate timestamps format with typia
    typia.assert(log.createdAt);
    typia.assert(log.updatedAt);
    // deletedAt may be null
    if (log.deletedAt !== null) {
      typia.assert(log.deletedAt);
    }
    // actor may be null or undefined
    if (log.actor !== null && log.actor !== undefined) {
      typia.assert(log.actor);
      TestValidator.predicate(
        "actor has valid id",
        typeof log.actor.id === "string" && log.actor.id.length > 0,
      );
      TestValidator.predicate(
        "actor has valid email",
        typeof log.actor.email === "string" && log.actor.email.length > 0,
      );
      TestValidator.predicate(
        "actor has valid displayName",
        typeof log.actor.displayName === "string" &&
          log.actor.displayName.length > 0,
      );
      TestValidator.predicate(
        "actor is not banned boolean",
        typeof log.actor.isBanned === "boolean",
      );
      TestValidator.predicate(
        "actor has valid createdAt string",
        typeof log.actor.createdAt === "string",
      );
      TestValidator.predicate(
        "actor has valid updatedAt string",
        typeof log.actor.updatedAt === "string",
      );
      // deletedAt may be null
      if (log.actor.deletedAt !== null && log.actor.deletedAt !== undefined) {
        typia.assert(log.actor.deletedAt);
      }
    }
  }
}
