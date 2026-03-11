import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoDataRetentionPolicy";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_multi_user_todo_admin_data_retention_policies_create } from "../../../generate/generate_random_multi_user_todo_admin_data_retention_policies_create";
import { prepare_random_multi_user_todo_data_retention_policy } from "../../../prepare/prepare_random_multi_user_todo_data_retention_policy";

export async function test_api_admin_data_retention_policy_compliance_required(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // Create compliance-required data retention policy using utility function
  const policy =
    await generate_random_multi_user_todo_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: RandomGenerator.paragraph({ sentences: 2 }),
          target_entity_type: "audit_log",
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          archival_strategy: "archive",
          enforcement_enabled: true,
          compliance_required: true,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IMultiUserTodoDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(policy);
  // Validate business logic - compliance_required flag is properly set
  TestValidator.equals(
    "compliance required flag",
    policy.compliance_required,
    true,
  );
  TestValidator.equals(
    "enforcement enabled flag",
    policy.enforcement_enabled,
    true,
  );
  TestValidator.equals(
    "target entity type",
    policy.target_entity_type,
    "audit_log",
  );
  TestValidator.equals(
    "archival strategy",
    policy.archival_strategy,
    "archive",
  );
}
