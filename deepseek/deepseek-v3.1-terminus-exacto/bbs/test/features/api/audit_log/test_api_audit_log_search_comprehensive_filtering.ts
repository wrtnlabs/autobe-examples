import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the comprehensive audit log search functionality with multiple filter combinations
 * to validate that administrators can effectively review platform activities.
 */
export async function test_api_audit_log_search_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connections
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test various filter combinations
  const currentDate = new Date().toISOString();
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  // Define test cases for different filter combinations
  const testCases = [
    // Actor type filters
    { actorType: "admin" as const, page: 1, limit: 10 },
    { actorType: "super_admin" as const, page: 1, limit: 10 },
    { actorType: "member" as const, page: 1, limit: 10 },
    { actorType: "system" as const, page: 1, limit: 10 },
    // Action type filters
    { actionType: "create_section", page: 1, limit: 10 },
    { actionType: "delete_article", page: 1, limit: 10 },
    { actionType: "ban_user", page: 1, limit: 10 },
    // Target type filters
    { targetType: "section", page: 1, limit: 10 },
    { targetType: "article", page: 1, limit: 10 },
    { targetType: "comment", page: 1, limit: 10 },
    { targetType: "user", page: 1, limit: 10 },
    // Date range filters
    { startDate: pastDate, endDate: currentDate, page: 1, limit: 10 },
    // IP address filter
    {
      ipAddress: typia.random<string & tags.Format<"ipv4">>(),
      page: 1,
      limit: 10,
    },
    // Text search
    { searchText: "admin", page: 1, limit: 10 },
    // Pagination tests
    { page: 1, limit: 5 },
    { page: 2, limit: 5 },
    { page: 1, limit: 50 },
    { page: 1, limit: 100 },
    // Combined filters
    {
      actorType: "admin" as const,
      actionType: "delete_article",
      targetType: "article",
      startDate: pastDate,
      endDate: currentDate,
      page: 1,
      limit: 20,
    },
  ];
  // Execute all test cases
  for (const testCase of testCases) {
    const searchResult =
      await api.functional.discussionBoard.admin.audit_logs.index(
        adminConnection,
        {
          body: testCase satisfies IDiscussionBoardAuditLog.IRequest,
        },
      );
    typia.assert(searchResult);
    // Validate pagination structure
    TestValidator.equals(
      "pagination object exists",
      typeof searchResult.pagination,
      "object",
    );
    TestValidator.predicate(
      "current page valid",
      searchResult.pagination.current >= 0,
    );
    TestValidator.predicate("limit valid", searchResult.pagination.limit >= 0);
    TestValidator.predicate(
      "records count valid",
      searchResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages count valid",
      searchResult.pagination.pages >= 0,
    );
    // Validate data structure
    if (searchResult.data.length > 0) {
      const sampleLog = searchResult.data[0];
      TestValidator.predicate(
        "audit log has id",
        typeof sampleLog.id === "string",
      );
      TestValidator.predicate(
        "audit log has actor_type",
        typeof sampleLog.actor_type === "string",
      );
      TestValidator.predicate(
        "audit log has target_type",
        typeof sampleLog.target_type === "string",
      );
      TestValidator.predicate(
        "audit log has action_type",
        typeof sampleLog.action_type === "string",
      );
      TestValidator.predicate(
        "audit log has created_at",
        typeof sampleLog.created_at === "string",
      );
    }
  }
  // 3. Test error cases for invalid parameters
  await TestValidator.error("invalid page number should fail", async () => {
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 0, // Invalid: minimum is 1
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  });
  await TestValidator.error("invalid limit should fail", async () => {
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 0, // Invalid: minimum is 1
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  });
  await TestValidator.error("exceeded limit should fail", async () => {
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 101, // Invalid: maximum is 100
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  });
  // 4. Test empty search (get all records)
  const allRecords =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(allRecords);
  // 5. Test that results are sorted by created_at descending
  if (allRecords.data.length > 1) {
    for (let i = 1; i < allRecords.data.length; i++) {
      const currentDate = new Date(allRecords.data[i].created_at);
      const previousDate = new Date(allRecords.data[i - 1].created_at);
      TestValidator.predicate(
        `results sorted descending: item ${i} should be earlier than item ${i - 1}`,
        currentDate <= previousDate,
      );
    }
  }
  // 6. Test future date range (should return empty results gracefully)
  const futureSearch =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(futureSearch);
}
