import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_data_retention_policies_create } from "../../../generate/generate_random_discussion_board_admin_data_retention_policies_create";
import { prepare_random_discussion_board_data_retention_policy } from "../../../prepare/prepare_random_discussion_board_data_retention_policy";

export async function test_api_data_retention_policy_soft_delete_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Step 2: Create an active data retention policy
  const policy =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3650>
          >(),
          retention_action: RandomGenerator.pick([
            "delete",
            "archive",
            "anonymize",
          ] as const),
          compliance_standard: RandomGenerator.pick([
            "GDPR",
            "CCPA",
            "HIPAA",
            null,
          ] as const),
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(policy);
  // Step 3: Soft delete the policy
  const softDeletedPolicy =
    await api.functional.discussionBoard.admin.data_retention_policies.erase(
      adminConnection,
      {
        policyId: policy.id,
      },
    );
  typia.assert(softDeletedPolicy);
  // Step 4: Validate soft delete operation
  TestValidator.equals(
    "policy ID should remain unchanged",
    softDeletedPolicy.id,
    policy.id,
  );
  TestValidator.equals(
    "policy name should remain unchanged",
    softDeletedPolicy.policy_name,
    policy.policy_name,
  );
  TestValidator.equals(
    "description should remain unchanged",
    softDeletedPolicy.description,
    policy.description,
  );
  TestValidator.equals(
    "retention period should remain unchanged",
    softDeletedPolicy.retention_period_days,
    policy.retention_period_days,
  );
  TestValidator.equals(
    "retention action should remain unchanged",
    softDeletedPolicy.retention_action,
    policy.retention_action,
  );
  TestValidator.equals(
    "compliance standard should remain unchanged",
    softDeletedPolicy.compliance_standard,
    policy.compliance_standard,
  );
  TestValidator.predicate(
    "deleted_at should be set",
    softDeletedPolicy.deleted_at !== null,
  );
  TestValidator.equals(
    "is_active should be false after soft delete",
    softDeletedPolicy.is_active,
    false,
  );
  TestValidator.predicate(
    "created_at should remain unchanged",
    softDeletedPolicy.created_at === policy.created_at,
  );
  TestValidator.predicate(
    "updated_at should reflect the soft delete operation",
    softDeletedPolicy.updated_at !== policy.updated_at,
  );
}
