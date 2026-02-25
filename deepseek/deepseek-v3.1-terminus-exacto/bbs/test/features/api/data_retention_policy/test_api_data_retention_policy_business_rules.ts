import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

/**
 * Test business rule validations for data retention policy creation.
 * 1. Create super administrator account
 * 2. Create initial policy with minimum retention period
 * 3. Test duplicate policy name constraint
 * 4. Test different retention actions
 * 5. Test null compliance standard
 */
export async function test_api_data_retention_policy_business_rules(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Create policy with minimum retention period
  const policy1 =
    await generate_random_discussion_board_super_admin_data_retention_policies_create(
      superAdminConnection,
      {
        body: {
          policy_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          retention_action: "archive" as const,
          compliance_standard: null,
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(policy1);
  // Test 2: Attempt to create duplicate policy name
  await TestValidator.error("duplicate policy name", async () => {
    await generate_random_discussion_board_super_admin_data_retention_policies_create(
      superAdminConnection,
      {
        body: {
          policy_name: policy1.policy_name,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          retention_action: "delete" as const,
          compliance_standard: "GDPR",
          is_active: false,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  });
  // Test 3: Create policy with anonymize action
  const policy2 =
    await generate_random_discussion_board_super_admin_data_retention_policies_create(
      superAdminConnection,
      {
        body: {
          policy_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          retention_action: "anonymize" as const,
          compliance_standard: "CCPA",
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(policy2);
  // Test 4: Create policy with null compliance standard
  const policy3 =
    await generate_random_discussion_board_super_admin_data_retention_policies_create(
      superAdminConnection,
      {
        body: {
          policy_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          retention_action: "delete" as const,
          compliance_standard: null,
          is_active: false,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(policy3);
  // Validate business rules
  TestValidator.equals(
    "policy1 name unique",
    false,
    policy1.policy_name !== policy2.policy_name,
  );
  TestValidator.equals(
    "policy2 name unique",
    false,
    policy2.policy_name !== policy3.policy_name,
  );
  TestValidator.predicate(
    "policy1 has valid retention period",
    policy1.retention_period_days >= 1,
  );
  TestValidator.predicate(
    "policy2 has valid retention period",
    policy2.retention_period_days >= 1,
  );
  TestValidator.predicate(
    "policy3 has valid retention period",
    policy3.retention_period_days >= 1,
  );
}