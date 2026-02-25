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

export async function test_api_data_retention_policy_creation_with_compliance(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000/admin/policies",
      referrer: "http://localhost:3000/admin",
      ip: "127.0.0.1",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Utility function for policy creation
  const createPolicy = async (
    complianceStandard: string | null,
    retentionPeriodDays: number,
    retentionAction: "delete" | "archive" | "anonymize",
    isActive: boolean,
  ): Promise<IDiscussionBoardDataRetentionPolicy> => {
    const body = {
      policy_name: `Policy ${RandomGenerator.alphaNumeric(8)}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      retention_period_days: retentionPeriodDays satisfies number as number,
      retention_action: retentionAction,
      compliance_standard: complianceStandard,
      is_active: isActive,
    } satisfies IDiscussionBoardDataRetentionPolicy.ICreate;
    const policy =
      await api.functional.discussionBoard.admin.data_retention_policies.create(
        adminConnection,
        { body },
      );
    typia.assert(policy);
    return policy;
  };
  // 2. Test with GDPR compliance and anonymize action
  const gdprPolicy = await createPolicy(
    "GDPR Article 17 - Right to Erasure",
    30,
    "anonymize",
    true,
  );
  TestValidator.equals(
    "GDPR compliance standard should match",
    gdprPolicy.compliance_standard,
    "GDPR Article 17 - Right to Erasure",
  );
  TestValidator.equals(
    "GDPR retention action should be anonymize",
    gdprPolicy.retention_action,
    "anonymize",
  );
  // 3. Test with CCPA compliance and delete action
  const ccpaPolicy = await createPolicy(
    "CCPA Section 1798.105",
    365,
    "delete",
    true,
  );
  TestValidator.equals(
    "CCPA compliance standard should match",
    ccpaPolicy.compliance_standard,
    "CCPA Section 1798.105",
  );
  TestValidator.equals(
    "CCPA retention action should be delete",
    ccpaPolicy.retention_action,
    "delete",
  );
  // 4. Test with null compliance standard (optional field)
  const noCompliancePolicy = await createPolicy(null, 90, "archive", true);
  TestValidator.equals(
    "Null compliance standard should be null",
    noCompliancePolicy.compliance_standard,
    null,
  );
  // 5. Test with is_active = false
  const inactivePolicy = await createPolicy(
    "Internal Policy",
    180,
    "archive",
    false,
  );
  TestValidator.equals(
    "Inactive policy should have is_active = false",
    inactivePolicy.is_active,
    false,
  );
  // 6. Validate retention period values
  TestValidator.equals(
    "GDPR policy retention period should be 30 days",
    gdprPolicy.retention_period_days,
    30,
  );
  TestValidator.equals(
    "CCPA policy retention period should be 365 days",
    ccpaPolicy.retention_period_days,
    365,
  );
  TestValidator.equals(
    "No compliance policy retention period should be 90 days",
    noCompliancePolicy.retention_period_days,
    90,
  );
}
