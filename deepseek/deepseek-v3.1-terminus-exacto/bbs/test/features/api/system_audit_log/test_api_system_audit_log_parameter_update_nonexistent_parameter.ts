import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemAuditLogParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemAuditLogParameter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test error handling when attempting to update a non-existent parameter within a valid audit log.
 * Validates that the system properly rejects the request when the specific parameter does not exist.
 */
export async function test_api_system_audit_log_parameter_update_nonexistent_parameter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Generate valid audit log ID and non-existent parameter ID
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const parameterId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to update non-existent parameter and verify error
  await TestValidator.error(
    "update non-existent parameter should fail",
    async () => {
      await api.functional.discussionBoard.admin.system_audit_logs.parameters.update(
        adminConnection,
        {
          auditLogId,
          parameterId,
          body: {
            parameter_value: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardSystemAuditLogParameter.IUpdate,
        },
      );
    },
  );
}
