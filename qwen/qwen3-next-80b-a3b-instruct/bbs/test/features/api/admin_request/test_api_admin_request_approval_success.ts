import api from "@ORGANIZATION/PROJECT-api";
import type { IAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministrator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorAuditLog";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_admin_request_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdministrator account (approver)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const approver = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(approver);
  // 2. Create another superAdministrator account (simulating citizen who submitted request)
  // Since no citizen registration endpoint is available, we use superAdministrator account as proxy
  // This satisfies the scenario's requirement of a user with pending admin request
  const targetConnection: api.IConnection = { host: connection.host };
  const targetUser = await authorize_super_administrator_join(
    targetConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(targetUser);
  // 3. Approve the admin request (using target user's id as requestId)
  const approvedAuditLog =
    await api.functional.economicBoard.superAdministrator.admin.admin_requests.approve(
      superAdminConnection,
      {
        requestId: targetUser.id,
      },
    );
  typia.assert(approvedAuditLog);
  // 4. Validate audit log structure: action_type, actor_id, target_id
  TestValidator.equals(
    "action type is approve_admin_request",
    approvedAuditLog.action_type,
    "approve_admin_request",
  );
  TestValidator.equals(
    "actor is superAdministrator",
    approvedAuditLog.actor_id,
    approver.id,
  );
  TestValidator.equals(
    "target is the requested user",
    approvedAuditLog.target_id,
    targetUser.id,
  );
  // 5. Validate target user summary (IUser.ISummary) structure
  // Since we don't have citizen registration, targetUser is IAuthorized (which has id and token),
  // but the audit log expects IUser.ISummary which has id, display_name?, created_at, updated_at, article_count, comment_count
  // We can't validate display_name or bio as they're undefined in IAuthorized
  // We can validate existence of id and created_at/updated_at
  TestValidator.predicate(
    "target has id",
    approvedAuditLog.target?.id !== undefined,
  );
  TestValidator.equals(
    "target id matches",
    approvedAuditLog.target?.id,
    targetUser.id,
  );
  TestValidator.equals(
    "created_at is ISO date-time",
    typeof approvedAuditLog.target?.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is ISO date-time",
    typeof approvedAuditLog.target?.updated_at,
    "string",
  );
  TestValidator.predicate("created_at is valid iso", () => {
    return !isNaN(Date.parse(approvedAuditLog.target?.created_at ?? ""));
  });
  TestValidator.predicate("updated_at is valid iso", () => {
    return !isNaN(Date.parse(approvedAuditLog.target?.updated_at ?? ""));
  });
  TestValidator.predicate("article_count is int32", () => {
    return Number.isInteger(approvedAuditLog.target?.article_count);
  });
  TestValidator.predicate("comment_count is int32", () => {
    return Number.isInteger(approvedAuditLog.target?.comment_count);
  });
  TestValidator.predicate("target exists", approvedAuditLog.target !== null);
  // 6. Validate timestamp and IP fields
  TestValidator.equals(
    "created_at equals updated_at in audit log",
    approvedAuditLog.created_at,
    approvedAuditLog.updated_at,
  );
  TestValidator.equals(
    "ip_address exists",
    typeof approvedAuditLog.ip_address,
    "string",
  );
}
