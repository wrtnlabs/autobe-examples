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

export async function test_api_audit_log_retrieve_existing_entry_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator registration and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongP@ssw0rd123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: null,
      },
    },
  );
  typia.assert(superAdmin);
  superAdminConnection.headers = {
    Authorization: superAdmin.token.access,
  };
  // 2. Since there's no API to create audit logs manually, we assume an existing audit log ID by retrieving any audit log via simulation
  const auditLogSample =
    await api.functional.discussionBoard.superAdministrator.auditLogs.atAuditLog(
      superAdminConnection,
      { id: typia.random<string & tags.Format<"uuid">>() },
    );
  typia.assert(auditLogSample);
  // 3. Retrieve the audit log with the existing ID
  const auditLog =
    await api.functional.discussionBoard.superAdministrator.auditLogs.atAuditLog(
      superAdminConnection,
      { id: auditLogSample.id },
    );
  // 4. Validate the full audit log record
  typia.assert(auditLog);
  // 5. Validate expected properties
  TestValidator.equals("audit log id", auditLog.id, auditLogSample.id);
  TestValidator.equals(
    "event type",
    auditLog.eventType,
    auditLogSample.eventType,
  );
  TestValidator.equals(
    "event description",
    auditLog.eventDescription,
    auditLogSample.eventDescription,
  );
  if (auditLog.actor) {
    if (auditLogSample.actor) {
      TestValidator.equals(
        "actor id",
        auditLog.actor.id,
        auditLogSample.actor.id,
      );
      TestValidator.equals(
        "actor email",
        auditLog.actor.email,
        auditLogSample.actor.email,
      );
      TestValidator.equals(
        "actor display name",
        auditLog.actor.displayName,
        auditLogSample.actor.displayName,
      );
      TestValidator.equals(
        "actor bio",
        auditLog.actor.bio,
        auditLogSample.actor.bio ?? null,
      );
      TestValidator.equals(
        "actor is banned",
        auditLog.actor.isBanned,
        auditLogSample.actor.isBanned,
      );
      TestValidator.equals(
        "actor createdAt",
        auditLog.actor.createdAt,
        auditLogSample.actor.createdAt,
      );
      TestValidator.equals(
        "actor updatedAt",
        auditLog.actor.updatedAt,
        auditLogSample.actor.updatedAt,
      );
      TestValidator.equals(
        "actor deletedAt",
        auditLog.actor.deletedAt ?? null,
        auditLogSample.actor.deletedAt ?? null,
      );
    } else {
      // If the sample had no actor, fail the test
      TestValidator.predicate("actor existence mismatch", false);
    }
  } else {
    TestValidator.predicate(
      "actor absence expected",
      auditLogSample.actor === null || auditLogSample.actor === undefined,
    );
  }
  TestValidator.equals(
    "createdAt",
    auditLog.createdAt,
    auditLogSample.createdAt,
  );
  TestValidator.equals(
    "updatedAt",
    auditLog.updatedAt,
    auditLogSample.updatedAt,
  );
  TestValidator.equals(
    "deletedAt",
    auditLog.deletedAt ?? null,
    auditLogSample.deletedAt ?? null,
  );
}
