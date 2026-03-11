import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_audit_log_parameter_not_found_failure(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator authorization context
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate random UUIDs for non-existent audit log and parameter
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const parameterId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete non-existent parameter and validate failure
  await TestValidator.error(
    "delete non-existent audit log parameter",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_audit_logs.parameters.erase(
        superAdminConnection,
        {
          auditLogId,
          parameterId,
        },
      );
    },
  );
}
