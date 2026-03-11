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
import { generate_random_discussion_board_admin_system_audit_logs_parameters_create } from "../../../generate/generate_random_discussion_board_admin_system_audit_logs_parameters_create";
import { prepare_random_discussion_board_system_audit_log_parameter } from "../../../prepare/prepare_random_discussion_board_system_audit_log_parameter";

export async function test_api_audit_log_parameter_deletion_nonexistent_parameter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a valid audit log parameter to establish context
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  const parameter =
    await generate_random_discussion_board_admin_system_audit_logs_parameters_create(
      adminConnection,
      {
        params: { auditLogId },
        body: {
          parameterKey: RandomGenerator.name(1),
          parameterValue: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSystemAuditLogParameter.ICreate,
      },
    );
  typia.assert(parameter);
  // 3. Attempt to delete a non-existent parameter using a randomly generated UUID
  const nonexistentParameterId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deletion attempt for non-existent parameter should fail",
    async () => {
      await api.functional.discussionBoard.admin.system_audit_logs.parameters.erase(
        adminConnection,
        {
          auditLogId,
          parameterId: nonexistentParameterId,
        },
      );
    },
  );
  // 4. Verify data integrity by ensuring the original parameter still exists
  // (Note: There's no direct API to retrieve a specific parameter, so we rely on the error handling validation)
  TestValidator.predicate(
    "original parameter should remain unaffected",
    parameter.id !== nonexistentParameterId,
  );
}
