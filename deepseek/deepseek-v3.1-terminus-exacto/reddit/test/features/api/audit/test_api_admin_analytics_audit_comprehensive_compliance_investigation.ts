import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Comprehensive audit log investigation test for compliance officer.
 * Tests advanced filtering capabilities including actor type, action type,
 * date ranges, IP patterns, and entity-specific filtering with pagination.
 */
export async function test_api_admin_analytics_audit_comprehensive_compliance_investigation(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: "compliance_officer",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Test 1: Filter by actor_type='user' and action_type='create_post'
  const userPostFilter =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      adminConnection,
      {
        body: {
          actor_type: "user",
          action_type: "create_post",
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(userPostFilter);
  // Validate all records match actor_type='user' and action_type='create_post'
  userPostFilter.data.forEach((log) => {
    TestValidator.equals("actor_type should be user", log.actor_type, "user");
    TestValidator.equals(
      "action_type should be create_post",
      log.action_type,
      "create_post",
    );
  });
  // Test 2: Filter by date range (last 30 days)
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const now = new Date().toISOString();
  const dateRangeFilter =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      adminConnection,
      {
        body: {
          start_date: thirtyDaysAgo,
          end_date: now,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(dateRangeFilter);
  // Validate all records are within date range
  dateRangeFilter.data.forEach((log) => {
    const logDate = new Date(log.created_at);
    const startDate = new Date(thirtyDaysAgo);
    const endDate = new Date(now);
    TestValidator.predicate(
      "log date should be within range",
      logDate >= startDate && logDate <= endDate,
    );
  });
  // Test 3: Filter by IP address pattern (192.168.*)
  const ipFilter =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      adminConnection,
      {
        body: {
          ip_address: "192.168",
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(ipFilter);
  // Validate IP addresses match pattern
  ipFilter.data.forEach((log) => {
    TestValidator.predicate(
      "IP should start with 192.168",
      log.ip_address.startsWith("192.168"),
    );
  });
  // Test 4: Filter by specific community_id
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const communityFilter =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      adminConnection,
      {
        body: {
          community_id: communityId,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(communityFilter);
  // Test 5: Filter by post_id
  const postId = typia.random<string & tags.Format<"uuid">>();
  const postFilter =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      adminConnection,
      {
        body: {
          post_id: postId,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(postFilter);
  // Test 6: Filter by comment_id
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const commentFilter =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      adminConnection,
      {
        body: {
          comment_id: commentId,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(commentFilter);
  // Test 7: Pagination with different page sizes
  const pageSizes = [10, 25, 50] as const;
  for (const pageSize of pageSizes) {
    const paginatedResults =
      await api.functional.communityPlatform.admin.analytics.audit.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: pageSize,
          } satisfies ICommunityPlatformAuditLog.IRequest,
        },
      );
    typia.assert(paginatedResults);
    // Validate pagination metadata
    TestValidator.equals(
      "page limit should match requested",
      paginatedResults.pagination.limit,
      pageSize,
    );
    TestValidator.predicate(
      "current page should be 1",
      paginatedResults.pagination.current === 1,
    );
    TestValidator.predicate(
      "data length should not exceed limit",
      paginatedResults.data.length <= pageSize,
    );
  }
  // Test 8: Combined filtering with multiple criteria
  const combinedFilter =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      adminConnection,
      {
        body: {
          actor_type: "user",
          action_type: "create_post",
          success: true,
          start_date: thirtyDaysAgo,
          end_date: now,
          ip_address: "192.168",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Validate combined filter results
  combinedFilter.data.forEach((log) => {
    TestValidator.equals("actor_type should be user", log.actor_type, "user");
    TestValidator.equals(
      "action_type should be create_post",
      log.action_type,
      "create_post",
    );
    TestValidator.equals("success should be true", log.success, true);
    TestValidator.predicate(
      "IP should start with 192.168",
      log.ip_address.startsWith("192.168"),
    );
    const logDate = new Date(log.created_at);
    const startDate = new Date(thirtyDaysAgo);
    const endDate = new Date(now);
    TestValidator.predicate(
      "log date should be within range",
      logDate >= startDate && logDate <= endDate,
    );
  });
  // Validate security metadata exists in all audit logs
  const allLogs =
    await api.functional.communityPlatform.admin.analytics.audit.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(allLogs);
  allLogs.data.forEach((log) => {
    TestValidator.predicate("should have id", log.id.length > 0);
    TestValidator.predicate(
      "should have actor_type",
      log.actor_type.length > 0,
    );
    TestValidator.predicate(
      "should have action_type",
      log.action_type.length > 0,
    );
    TestValidator.predicate(
      "should have success flag",
      typeof log.success === "boolean",
    );
    TestValidator.predicate(
      "should have IP address",
      log.ip_address.length > 0,
    );
    TestValidator.predicate(
      "should have created_at timestamp",
      log.created_at.length > 0,
    );
  });
}
