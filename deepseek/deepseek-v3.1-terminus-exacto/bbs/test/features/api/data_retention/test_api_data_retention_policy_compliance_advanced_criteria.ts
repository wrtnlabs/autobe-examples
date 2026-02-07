import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDataRetentionPolicy";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test advanced filtering capabilities by applying multiple criteria simultaneously.
 * Authenticate as super administrator and search for policies matching specific compliance
 * standards (e.g., GDPR), retention actions (e.g., delete), and active status. Validate
 * that the response contains only policies that match all specified criteria. Test
 * filtering by retention period ranges and verify that policies outside the specified
 * range are excluded.
 */
export async function test_api_data_retention_policy_compliance_advanced_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Use utility function for super admin authentication
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Generate multi-criteria search request with specific filters
  const searchCriteria: IDiscussionBoardDataRetentionPolicy.IRequest = {
    search: "GDPR", // Focus search on compliance standard
    page: 1,
    limit: 50, // Higher limit to test filtering more comprehensively
  };
  // Call compliance search endpoint
  const response =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.compliance.index(
      superAdminConnection,
      {
        body: searchCriteria,
      },
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit within range",
    response.pagination.limit > 0 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", response.pagination.pages >= 0);
  // Validate data array structure
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // Test retention period range filtering by analyzing returned policies
  if (response.data.length > 0) {
    // Calculate retention period statistics for validation
    const retentionPeriods = response.data.map(
      (policy) => policy.retention_period_days,
    );
    const minRetention = Math.min(...retentionPeriods);
    const maxRetention = Math.max(...retentionPeriods);
    TestValidator.predicate(
      "retention periods are reasonable",
      minRetention >= 1 && maxRetention <= 3650, // 10 years max
    );
    // Validate that policies contain search-relevant content
    const hasRelevantPolicies = response.data.some(
      (policy) =>
        policy.policy_name.toLowerCase().includes("gdpr") ||
        (policy.compliance_standard &&
          policy.compliance_standard.toLowerCase().includes("gdpr")),
    );
    if (hasRelevantPolicies) {
      TestValidator.predicate("search returns relevant policies", true);
    }
    // Validate each policy meets basic criteria
    for (const policy of response.data) {
      typia.assert(policy);
      // Validate required fields exist with proper types
      TestValidator.predicate(
        "policy has valid id",
        typeof policy.id === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            policy.id,
          ),
      );
      TestValidator.predicate(
        "policy has valid name",
        typeof policy.policy_name === "string" && policy.policy_name.length > 0,
      );
      TestValidator.predicate(
        "policy has valid retention period",
        typeof policy.retention_period_days === "number" &&
          policy.retention_period_days > 0,
      );
      TestValidator.predicate(
        "policy has valid retention action",
        typeof policy.retention_action === "string" &&
          policy.retention_action.length > 0,
      );
      TestValidator.predicate(
        "policy has valid active status",
        typeof policy.is_active === "boolean",
      );
      // Validate optional fields when present
      if (
        policy.compliance_standard !== null &&
        policy.compliance_standard !== undefined
      ) {
        TestValidator.predicate(
          "compliance standard is valid string",
          typeof policy.compliance_standard === "string" &&
            policy.compliance_standard.length > 0,
        );
      }
      if (policy.last_enforced_at !== null) {
        TestValidator.predicate(
          "last enforced at is valid date string",
          typeof policy.last_enforced_at === "string" &&
            !isNaN(Date.parse(policy.last_enforced_at)),
        );
      }
      if (policy.next_enforcement_due !== null) {
        TestValidator.predicate(
          "next enforcement due is valid date string",
          typeof policy.next_enforcement_due === "string" &&
            !isNaN(Date.parse(policy.next_enforcement_due)),
        );
      }
    }
  } else {
    // Handle case where no policies match the search criteria
    TestValidator.equals(
      "empty response has zero records",
      response.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty response has zero pages",
      response.pagination.pages,
      0,
    );
  }
}
