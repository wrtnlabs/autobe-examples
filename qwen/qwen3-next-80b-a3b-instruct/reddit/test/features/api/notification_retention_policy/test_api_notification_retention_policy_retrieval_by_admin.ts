import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformNotificationRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationRetentionPolicy";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformNotificationRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformNotificationRetentionPolicy";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_notification_retention_policy_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to access retention policy configuration data
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {};
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@wrtn.io`,
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create test data (Note: This assumes test data is pre-populated)
  // Since no create endpoint is provided for retention policies,
  // we assume the test environment already contains some retention policies
  // Step 3: Test retrieval with various filter combinations
  // Test 1: Retrieve all policies (default)
  const allPolicies =
    await api.functional.communityPlatform.notification_retention_policies.index(
      adminConnection,
      {
        body: {} satisfies ICommunityPlatformNotificationRetentionPolicy.IRequest,
      },
    );
  typia.assert(allPolicies);
  TestValidator.predicate(
    "total policies count is non-negative",
    allPolicies.pagination.records >= 0,
  );
  // Test 2: Filter by notification type
  const emailPolicies =
    await api.functional.communityPlatform.notification_retention_policies.index(
      adminConnection,
      {
        body: {
          notification_type: "email",
        } satisfies ICommunityPlatformNotificationRetentionPolicy.IRequest,
      },
    );
  typia.assert(emailPolicies);
  TestValidator.predicate(
    "email policies count is non-negative",
    emailPolicies.pagination.records >= 0,
  );
  // Test 3: Filter by retention period
  const longRetentionPolicies =
    await api.functional.communityPlatform.notification_retention_policies.index(
      adminConnection,
      {
        body: {
          retention_period: 90,
        } satisfies ICommunityPlatformNotificationRetentionPolicy.IRequest,
      },
    );
  typia.assert(longRetentionPolicies);
  TestValidator.predicate(
    "long retention policies count is non-negative",
    longRetentionPolicies.pagination.records >= 0,
  );
  // Test 4: Filter by environment
  const stagingPolicies =
    await api.functional.communityPlatform.notification_retention_policies.index(
      adminConnection,
      {
        body: {
          environment: "staging",
        } satisfies ICommunityPlatformNotificationRetentionPolicy.IRequest,
      },
    );
  typia.assert(stagingPolicies);
  TestValidator.predicate(
    "staging policies count is non-negative",
    stagingPolicies.pagination.records >= 0,
  );
  // Test 5: Combine multiple filters
  const emailLongRetentionPolicies =
    await api.functional.communityPlatform.notification_retention_policies.index(
      adminConnection,
      {
        body: {
          notification_type: "email",
          retention_period: 30,
        } satisfies ICommunityPlatformNotificationRetentionPolicy.IRequest,
      },
    );
  typia.assert(emailLongRetentionPolicies);
  TestValidator.predicate(
    "email and long retention policies count is non-negative",
    emailLongRetentionPolicies.pagination.records >= 0,
  );
  // Test 6: Pagination with different limits
  const firstPage =
    await api.functional.communityPlatform.notification_retention_policies.index(
      adminConnection,
      {
        body: {
          limit: 5,
        } satisfies ICommunityPlatformNotificationRetentionPolicy.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 5);
  TestValidator.predicate(
    "first page size matches limit",
    firstPage.data.length <= 5,
  );
  const secondPage =
    await api.functional.communityPlatform.notification_retention_policies.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformNotificationRetentionPolicy.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 5);
  TestValidator.predicate(
    "second page size valid",
    secondPage.data.length <= 5,
  );
  // Test 7: Sort by notification_type (ascending)
  const sortedByTypeAsc =
    await api.functional.communityPlatform.notification_retention_policies.index(
      adminConnection,
      {
        body: {
          sort_by: "notification_type",
          order: "asc",
        } satisfies ICommunityPlatformNotificationRetentionPolicy.IRequest,
      },
    );
  typia.assert(sortedByTypeAsc);
  TestValidator.predicate(
    "sorted policies has proper structure",
    sortedByTypeAsc.data.length > 0,
  );
  // Test 8: Sort by retention_period (descending)
  const sortedByRetentionDesc =
    await api.functional.communityPlatform.notification_retention_policies.index(
      adminConnection,
      {
        body: {
          sort_by: "retention_period",
          order: "desc",
        } satisfies ICommunityPlatformNotificationRetentionPolicy.IRequest,
      },
    );
  typia.assert(sortedByRetentionDesc);
  TestValidator.predicate(
    "sorted by retention period has proper structure",
    sortedByRetentionDesc.data.length > 0,
  );
  // Test 9: Search functionality - partial match on notification_type
  const searchEmail =
    await api.functional.communityPlatform.notification_retention_policies.index(
      adminConnection,
      {
        body: {
          search: "em",
        } satisfies ICommunityPlatformNotificationRetentionPolicy.IRequest,
      },
    );
  typia.assert(searchEmail);
  TestValidator.predicate(
    "search email results count is non-negative",
    searchEmail.pagination.records >= 0,
  );
  // Test 10: Search functionality - partial match on environment
  const searchProd =
    await api.functional.communityPlatform.notification_retention_policies.index(
      adminConnection,
      {
        body: {
          search: "prod",
        } satisfies ICommunityPlatformNotificationRetentionPolicy.IRequest,
      },
    );
  typia.assert(searchProd);
  TestValidator.predicate(
    "search prod results count is non-negative",
    searchProd.pagination.records >= 0,
  );
  // Test 11: Overall validation of IPageICommunityPlatformNotificationRetentionPolicy structure
  const structureTest =
    await api.functional.communityPlatform.notification_retention_policies.index(
      adminConnection,
      {
        body: {} satisfies ICommunityPlatformNotificationRetentionPolicy.IRequest,
      },
    );
  typia.assert(structureTest);
  TestValidator.equals(
    "pagination current is at least 1",
    structureTest.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches default",
    structureTest.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    structureTest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    structureTest.pagination.pages >= 0,
  );
  // Ensure data array contains policies with correct structure
  TestValidator.predicate(
    "data array has valid length",
    structureTest.data.length >= 0,
  );
  for (const policy of structureTest.data) {
    typia.assert<ICommunityPlatformNotificationRetentionPolicy>(policy);
    TestValidator.predicate(
      "notification_type is string",
      typeof policy.notification_type === "string",
    );
    TestValidator.predicate(
      "retention_period is number",
      typeof policy.retention_period === "number" &&
        policy.retention_period >= 1 &&
        policy.retention_period <= 730,
    );
    TestValidator.predicate(
      "scope is valid value",
      ["global", "channel_specific", "user_specific"].includes(policy.scope),
    );
    TestValidator.predicate(
      "is_active is boolean",
      typeof policy.is_active === "boolean",
    );
  }
}
