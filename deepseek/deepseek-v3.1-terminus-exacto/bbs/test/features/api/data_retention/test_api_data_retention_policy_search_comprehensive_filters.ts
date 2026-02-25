import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_data_retention_policy_search_comprehensive_filters(
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
  // Test comprehensive filter - Only GDPR + delete + active + 30-90 days range
  const retentionPeriodMin = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >() satisfies number as number;
  const retentionPeriodMax = (retentionPeriodMin +
    60) satisfies number as number;
  const comprehensiveSearch =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
      superAdminConnection,
      {
        body: {
          search: "GDPR delete",
          compliance_standard: "GDPR",
          retention_action: "delete",
          is_active: true,
          retention_period_days_min:
            retentionPeriodMin satisfies number as number,
          retention_period_days_max:
            retentionPeriodMax satisfies number as number,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(comprehensiveSearch);
  // Validate pagination metadata
  TestValidator.predicate(
    "has pagination metadata",
    comprehensiveSearch.pagination !== undefined,
  );
  // Cast pagination properties with type assertion to match actual API response
  const pagination = comprehensiveSearch.pagination;
  if (pagination) {
    // Use type assertion to access properties that might exist in runtime
    const current = (pagination as any).current;
    const limit = (pagination as any).limit;
    const pages = (pagination as any).pages;
    const records = (pagination as any).records;
    
    TestValidator.predicate(
      "current page matches request",
      current === 1,
    );
    TestValidator.predicate(
      "limit matches request",
      limit === 10,
    );
    TestValidator.predicate(
      "pages calculated correctly",
      pages !== undefined && pages >= 0,
    );
    TestValidator.predicate(
      "records count non-negative",
      records !== undefined && records >= 0,
    );
  }
  // Test individual filters separately to verify each works correctly
  const searchByName =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
      superAdminConnection,
      {
        body: {
          search: "GDPR",
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(searchByName);
  const searchByCompliance =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
      superAdminConnection,
      {
        body: {
          compliance_standard: "GDPR",
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(searchByCompliance);
  const searchByAction =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
      superAdminConnection,
      {
        body: {
          retention_action: "delete",
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(searchByAction);
  const searchByActive =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
      superAdminConnection,
      {
        body: {
          is_active: true,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(searchByActive);
  // Test range filter with specific values
  const minValue = 30 satisfies number as number;
  const maxValue = 90 satisfies number as number;
  const searchByRange =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.index(
      superAdminConnection,
      {
        body: {
          retention_period_days_min: minValue,
          retention_period_days_max: maxValue,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardDataRetentionPolicy.IRequest,
      },
    );
  typia.assert(searchByRange);
  // Verify that combining filters works correctly
  // All policies returned in comprehensive search should match all conditions
  for (const policy of comprehensiveSearch.data) {
    TestValidator.equals(
      "policy name contains search term",
      policy.policy_name.toLowerCase().includes("gdpr delete"),
      true,
    );
    TestValidator.equals(
      "policy has GDPR compliance",
      policy.compliance_standard,
      "GDPR",
    );
    TestValidator.equals(
      "policy has delete action",
      policy.retention_action,
      "delete",
    );
    TestValidator.predicate("policy is active", policy.is_active === true);
    TestValidator.predicate(
      "retention period within range",
      policy.retention_period_days >= minValue &&
        policy.retention_period_days <= maxValue,
    );
  }
}
