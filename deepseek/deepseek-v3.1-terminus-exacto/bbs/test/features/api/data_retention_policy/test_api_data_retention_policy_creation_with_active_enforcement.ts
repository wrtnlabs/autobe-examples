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

export async function test_api_data_retention_policy_creation_with_active_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Test creation of active policy with archive action
  const archivePolicy =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          retention_action: "archive",
          compliance_standard: "Internal Data Governance",
          is_active: true,
        },
      },
    );
  typia.assert(archivePolicy);
  // Test creation of active policy with delete action
  const deletePolicy =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          retention_action: "delete",
          compliance_standard: "GDPR",
          is_active: true,
        },
      },
    );
  typia.assert(deletePolicy);
  // Test creation of active policy with anonymize action
  const anonymizePolicy =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          retention_action: "anonymize",
          compliance_standard: "CCPA",
          is_active: true,
        },
      },
    );
  typia.assert(anonymizePolicy);
  // Test creation of inactive policy
  const inactivePolicy =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          retention_action: "archive",
          compliance_standard: null,
          is_active: false,
        },
      },
    );
  typia.assert(inactivePolicy);
  // Validate that all policies have proper system fields
  TestValidator.equals(
    "archive policy has correct retention action",
    archivePolicy.retention_action,
    "archive",
  );
  TestValidator.equals(
    "delete policy has correct retention action",
    deletePolicy.retention_action,
    "delete",
  );
  TestValidator.equals(
    "anonymize policy has correct retention action",
    anonymizePolicy.retention_action,
    "anonymize",
  );
  TestValidator.equals(
    "inactive policy has correct is_active",
    inactivePolicy.is_active,
    false,
  );
  // Validate retention period is positive
  TestValidator.predicate(
    "archive policy has positive retention period",
    archivePolicy.retention_period_days > 0,
  );
  TestValidator.predicate(
    "delete policy has positive retention period",
    deletePolicy.retention_period_days > 0,
  );
  TestValidator.predicate(
    "anonymize policy has positive retention period",
    anonymizePolicy.retention_period_days > 0,
  );
  TestValidator.predicate(
    "inactive policy has positive retention period",
    inactivePolicy.retention_period_days > 0,
  );
  // Validate compliance standards
  TestValidator.equals(
    "archive policy has correct compliance standard",
    archivePolicy.compliance_standard,
    "Internal Data Governance",
  );
  TestValidator.equals(
    "delete policy has correct compliance standard",
    deletePolicy.compliance_standard,
    "GDPR",
  );
  TestValidator.equals(
    "anonymize policy has correct compliance standard",
    anonymizePolicy.compliance_standard,
    "CCPA",
  );
  TestValidator.equals(
    "inactive policy has null compliance standard",
    inactivePolicy.compliance_standard,
    null,
  );
  // Validate policy names are unique
  TestValidator.notEquals(
    "policy names are unique",
    archivePolicy.policy_name,
    deletePolicy.policy_name,
  );
  TestValidator.notEquals(
    "policy names are unique",
    archivePolicy.policy_name,
    anonymizePolicy.policy_name,
  );
  TestValidator.notEquals(
    "policy names are unique",
    archivePolicy.policy_name,
    inactivePolicy.policy_name,
  );
  TestValidator.notEquals(
    "policy names are unique",
    deletePolicy.policy_name,
    anonymizePolicy.policy_name,
  );
  TestValidator.notEquals(
    "policy names are unique",
    deletePolicy.policy_name,
    inactivePolicy.policy_name,
  );
  TestValidator.notEquals(
    "policy names are unique",
    anonymizePolicy.policy_name,
    inactivePolicy.policy_name,
  );
}
