import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_audit_log_retrieval_with_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare superAdministrator connection by joining (registering) new superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdmin);
  // 2. Request audit logs with empty filter and default pagination (no filters)
  const body: IDiscussionBoardAuditLog.IRequest = {
    // no filters
  };
  const auditLogs =
    await api.functional.discussionBoard.superAdministrator.auditLogs.index(
      superAdminConnection,
      { body },
    );
  typia.assert(auditLogs);
  // 3. Validate pagination properties
  TestValidator.predicate(
    "pagination current page is valid",
    auditLogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    auditLogs.pagination.limit >= 1 && auditLogs.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    auditLogs.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    auditLogs.pagination.records >= 0,
  );
  // 4. Validate data array and fields
  TestValidator.predicate(
    "auditLogs.data is array",
    Array.isArray(auditLogs.data),
  );
  for (const log of auditLogs.data) {
    typia.assert(log);
    // Validate required fields
    TestValidator.predicate(
      "eventType is non-empty string",
      typeof log.eventType === "string" && log.eventType.length > 0,
    );
    TestValidator.predicate(
      "eventDescription is non-empty string",
      typeof log.eventDescription === "string" &&
        log.eventDescription.length > 0,
    );
    TestValidator.predicate(
      "createdAt matches ISO string format",
      typeof log.createdAt === "string" &&
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(log.createdAt),
    );
    // actor can be null or defined, if defined validate
    if (log.actor !== null && log.actor !== undefined) {
      typia.assert(log.actor);
      TestValidator.predicate(
        "actor id is valid UUID",
        typeof log.actor.id === "string" &&
          /^[0-9a-fA-F-]{36}$/.test(log.actor.id),
      );
      TestValidator.predicate(
        "actor email is string",
        typeof log.actor.email === "string",
      );
      TestValidator.predicate(
        "actor displayName is string",
        typeof log.actor.displayName === "string",
      );
      TestValidator.predicate(
        "actor isBanned is boolean",
        typeof log.actor.isBanned === "boolean",
      );
      TestValidator.predicate(
        "actor createdAt is ISO string",
        typeof log.actor.createdAt === "string" &&
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(log.actor.createdAt),
      );
      TestValidator.predicate(
        "actor updatedAt is ISO string",
        typeof log.actor.updatedAt === "string" &&
          /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(log.actor.updatedAt),
      );
    }
  }
  // 5. Test unauthorized access is denied
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access to audit logs",
    401,
    async () => {
      await api.functional.discussionBoard.superAdministrator.auditLogs.index(
        unauthorizedConnection,
        { body },
      );
    },
  );
}
