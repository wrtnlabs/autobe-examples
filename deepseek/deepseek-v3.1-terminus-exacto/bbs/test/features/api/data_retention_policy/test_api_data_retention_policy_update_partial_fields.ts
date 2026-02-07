import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
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
import { generate_random_discussion_board_super_admin_data_retention_policies_create } from "../../../generate/generate_random_discussion_board_super_admin_data_retention_policies_create";
import { prepare_random_discussion_board_data_retention_policy } from "../../../prepare/prepare_random_discussion_board_data_retention_policy";

export async function test_api_data_retention_policy_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create initial policy with specific values
  const initialPolicy =
    await generate_random_discussion_board_super_admin_data_retention_policies_create(
      superAdminConnection,
      {
        body: {
          policy_name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<7300>
          >(),
          retention_action: "delete" as "delete" | "archive" | "anonymize",
          compliance_standard: "GDPR",
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(initialPolicy);
  // Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Update only policy_name and description fields
  const updatedPolicy =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.update(
      superAdminConnection,
      {
        policyId: initialPolicy.id,
        body: {
          policy_name: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardDataRetentionPolicy.IUpdate,
      },
    );
  typia.assert(updatedPolicy);
  // Validate that only specified fields were modified
  TestValidator.equals(
    "policy name updated",
    updatedPolicy.policy_name !== initialPolicy.policy_name,
    true,
  );
  TestValidator.equals(
    "description updated",
    updatedPolicy.description !== initialPolicy.description,
    true,
  );
  // Validate that unchanged fields retain original values
  TestValidator.equals(
    "retention period unchanged",
    updatedPolicy.retention_period_days,
    initialPolicy.retention_period_days,
  );
  TestValidator.equals(
    "retention action unchanged",
    updatedPolicy.retention_action,
    initialPolicy.retention_action,
  );
  TestValidator.equals(
    "compliance standard unchanged",
    updatedPolicy.compliance_standard,
    initialPolicy.compliance_standard,
  );
  TestValidator.equals(
    "is_active unchanged",
    updatedPolicy.is_active,
    initialPolicy.is_active,
  );
  // Validate timestamp updates
  TestValidator.predicate(
    "created_at unchanged",
    updatedPolicy.created_at === initialPolicy.created_at,
  );
  TestValidator.predicate(
    "updated_at is newer",
    new Date(updatedPolicy.updated_at) > new Date(initialPolicy.updated_at),
  );
  // Validate system-generated fields
  TestValidator.equals("id unchanged", updatedPolicy.id, initialPolicy.id);
  TestValidator.predicate(
    "last_enforced_at unchanged",
    updatedPolicy.last_enforced_at === initialPolicy.last_enforced_at,
  );
  TestValidator.predicate(
    "next_enforcement_due unchanged",
    updatedPolicy.next_enforcement_due === initialPolicy.next_enforcement_due,
  );
  TestValidator.predicate(
    "deleted_at unchanged",
    updatedPolicy.deleted_at === initialPolicy.deleted_at,
  );
}
