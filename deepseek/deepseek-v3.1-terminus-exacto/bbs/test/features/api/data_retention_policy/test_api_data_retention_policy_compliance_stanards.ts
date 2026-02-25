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

/**
 * Test retrieval of data retention policies with different compliance standards.
 *
 * This test validates that data retention policies correctly handle compliance standard
 * fields when retrieved. It creates policies with different standards (GDPR, CCPA, HIPAA)
 * and one without any standard, then verifies each policy can be retrieved and the
 * compliance_standard field is properly populated (either the expected string or null).
 */
export async function test_api_data_retention_policy_compliance_stanards(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
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
  // 2. Define test compliance standards including null for no standard
  const testComplianceStandards = [
    "GDPR", // General Data Protection Regulation
    "CCPA", // California Consumer Privacy Act
    "HIPAA", // Health Insurance Portability and Accountability Act
    null, // No compliance standard
  ] as const;
  const createdPolicies: IDiscussionBoardDataRetentionPolicy[] = [];
  // 3. Create test policies with different compliance standards
  for (const complianceStandard of testComplianceStandards) {
    const policy =
      await generate_random_discussion_board_admin_data_retention_policies_create(
        adminConnection,
        {
          body: {
            policy_name: `Test Policy ${complianceStandard ?? "No-Compliance"}`,
            description: `Test policy for ${complianceStandard ?? "no compliance standard"}`,
            retention_period_days: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            retention_action: RandomGenerator.pick([
              "delete",
              "archive",
              "anonymize",
            ] as const),
            compliance_standard: complianceStandard,
            is_active: true,
          } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
        },
      );
    typia.assert(policy);
    createdPolicies.push(policy);
    // 4. Immediately retrieve and validate each created policy
    const retrievedPolicy =
      await api.functional.discussionBoard.admin.data_retention_policies.at(
        adminConnection,
        {
          policyId: policy.id,
        },
      );
    typia.assert(retrievedPolicy);
    // 5. Verify the retrieved policy matches the created one
    TestValidator.equals("policy ID matches", retrievedPolicy.id, policy.id);
    TestValidator.equals(
      "policy name matches",
      retrievedPolicy.policy_name,
      policy.policy_name,
    );
    TestValidator.equals(
      "compliance standard matches",
      retrievedPolicy.compliance_standard,
      policy.compliance_standard,
    );
    TestValidator.equals(
      "retention period matches",
      retrievedPolicy.retention_period_days,
      policy.retention_period_days,
    );
    TestValidator.equals(
      "retention action matches",
      retrievedPolicy.retention_action,
      policy.retention_action,
    );
    TestValidator.predicate("policy is active", retrievedPolicy.is_active);
    // 6. Specific validation for compliance standard handling
    if (complianceStandard === null) {
      TestValidator.equals(
        "null compliance standard handled correctly",
        retrievedPolicy.compliance_standard,
        null,
      );
    } else {
      TestValidator.equals(
        "compliance standard string preserved",
        retrievedPolicy.compliance_standard,
        complianceStandard,
      );
    }
  }
  // 7. Additional validation: Retrieve all policies again to ensure consistency
  for (const originalPolicy of createdPolicies) {
    const finalRetrievedPolicy =
      await api.functional.discussionBoard.admin.data_retention_policies.at(
        adminConnection,
        {
          policyId: originalPolicy.id,
        },
      );
    typia.assert(finalRetrievedPolicy);
    // Verify all fields remain consistent
    TestValidator.equals(
      "policy consistency - ID",
      finalRetrievedPolicy.id,
      originalPolicy.id,
    );
    TestValidator.equals(
      "policy consistency - compliance standard",
      finalRetrievedPolicy.compliance_standard,
      originalPolicy.compliance_standard,
    );
    TestValidator.equals(
      "policy consistency - name",
      finalRetrievedPolicy.policy_name,
      originalPolicy.policy_name,
    );
  }
}
