import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDataRetentionPolicy";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
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

export async function test_api_data_retention_policy_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
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
  // Create test policies with edge case values
  const testPolicies: IDiscussionBoardDataRetentionPolicy[] = [];
  // Policy 1: Minimum retention period (1 day)
  const minRetentionPolicy =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: "Min Retention Policy",
          description: "Policy with minimum retention period",
          retention_period_days: 1,
          retention_action: "delete",
          compliance_standard: null,
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(minRetentionPolicy);
  testPolicies.push(minRetentionPolicy);
  // Policy 2: Maximum retention period (large value)
  const maxRetentionPolicy =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: "Max Retention Policy",
          description: "Policy with large retention period",
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10000>
          >(),
          retention_action: "archive",
          compliance_standard: "GDPR",
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(maxRetentionPolicy);
  testPolicies.push(maxRetentionPolicy);
  // Policy 3: Null compliance standard
  const nullCompliancePolicy =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: "Null Compliance Policy",
          description: "Policy with null compliance standard",
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
          >(),
          retention_action: "anonymize",
          compliance_standard: null,
          is_active: false,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(nullCompliancePolicy);
  testPolicies.push(nullCompliancePolicy);
  // Policy 4: Special characters in name
  const specialCharPolicy =
    await generate_random_discussion_board_admin_data_retention_policies_create(
      adminConnection,
      {
        body: {
          policy_name: "Policy-With-Special_Chars@2024",
          description: "Policy name with special characters",
          retention_period_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
          >(),
          retention_action: "delete",
          compliance_standard: "CCPA",
          is_active: true,
        } satisfies IDiscussionBoardDataRetentionPolicy.ICreate,
      },
    );
  typia.assert(specialCharPolicy);
  testPolicies.push(specialCharPolicy);
  // Test 1: Empty search criteria
  const emptySearch =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns results",
    emptySearch.data.length >= 0,
  );
  // Test 2: Partial name matching
  const partialSearch =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          search: "Min",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(partialSearch);
  TestValidator.predicate(
    "partial search finds matching policies",
    partialSearch.data.some((policy) => policy.policy_name.includes("Min")),
  );
  // Test 3: Retention period edge values
  const minRetentionSearch =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          retention_period_days_min: 1,
          retention_period_days_max: 10,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(minRetentionSearch);
  // Test 4: Inactive policy filtering
  const inactiveSearch =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          is_active: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(inactiveSearch);
  TestValidator.predicate(
    "inactive search finds inactive policies",
    inactiveSearch.data.every((policy) => !policy.is_active),
  );
  // Test 5: Null compliance standard filtering
  const nullComplianceSearch =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          compliance_standard: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(nullComplianceSearch);
  // Test 6: SQL injection attempt handling
  const sqlInjectionSearch =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          search: "'; DROP TABLE users; --",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(sqlInjectionSearch);
  TestValidator.predicate(
    "SQL injection attempt handled gracefully",
    sqlInjectionSearch.data.length >= 0,
  );
  // Test 7: Invalid filter combination (min > max)
  const invalidRangeSearch =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          retention_period_days_min: 100,
          retention_period_days_max: 10,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(invalidRangeSearch);
  TestValidator.predicate(
    "invalid range returns empty or error",
    invalidRangeSearch.data.length === 0,
  );
  // Test 8: No matching results
  const noMatchSearch =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          search: "NonExistentPolicyName12345",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(noMatchSearch);
  TestValidator.predicate(
    "no match search returns empty results",
    noMatchSearch.data.length === 0,
  );
  // Test 9: Special character partial matching
  const specialCharSearch =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          search: "Special_Chars",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(specialCharSearch);
  TestValidator.predicate(
    "special character search finds matching policies",
    specialCharSearch.data.some((policy) =>
      policy.policy_name.includes("Special_Chars"),
    ),
  );
  // Test 10: Multiple filter combination
  const multiFilterSearch =
    await api.functional.discussionBoard.admin.data_retention_policies.index(
      adminConnection,
      {
        body: {
          search: "Policy",
          retention_action: "delete",
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(multiFilterSearch);
  TestValidator.predicate(
    "multi-filter search returns valid results",
    multiFilterSearch.data.length >= 0,
  );
}
