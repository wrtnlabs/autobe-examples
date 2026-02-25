import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_audit_logs_deletion_success_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdministrator and authorize
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // 2. Create a mock UUID to delete (simulate existing audit log id)
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete audit log with valid UUID and check no error
  await TestValidator.error(
    "superAdministrator deletes audit log without error",
    async () => {
      await api.functional.discussionBoard.superAdministrator.auditLogs.eraseAuditLog(
        superAdminConnection,
        {
          id: auditLogId,
        },
      );
    },
  );
  // 4. Validation done by typia.assert on superAdmin authorized info
  typia.assert(superAdmin);
}
