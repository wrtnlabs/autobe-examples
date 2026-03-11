import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminAuditLog";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_filtering_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin Authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Define all action types to test
  const actionTypes = [
    "ban",
    "unban",
    "delete_article",
    "delete_comment",
    "create_section",
    "edit_section",
    "delete_section",
    "approve_admin_request",
    "reject_admin_request",
    "promote_admin",
    "demote_admin",
  ] as const;
  // 3. Test filtering by each action type
  for (const actionType of actionTypes) {
    const filterRequest = {
      action_type: actionType,
      page: 1,
      limit: 10,
      sort: "created_at DESC",
    } satisfies IDiscussionBoardAdminAuditLog.IRequest;
    const result = await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: filterRequest,
      },
    );
    typia.assert(result);
    // Verify all returned entries match the filtered action type
    for (const log of result.data) {
      TestValidator.equals(
        `action_type matches filter for ${actionType}`,
        log.action_type,
        actionType,
      );
    }
    // Verify pagination metadata reflects filtered count
    TestValidator.equals(
      `pagination records matches data length for ${actionType}`,
      result.pagination.records,
      result.data.length,
    );
    // Verify pages calculation is correct
    const expectedPages =
      result.data.length === 0
        ? 0
        : Math.ceil(result.data.length / filterRequest.limit!);
    TestValidator.equals(
      `pagination pages correct for ${actionType}`,
      result.pagination.pages,
      expectedPages,
    );
  }
  // 4. Test edge case - filter with action type that has no logs
  // Use a unique filter combination likely to return no results
  const emptyFilterRequest = {
    action_type: "ban",
    page: 9999,
    limit: 10,
    sort: "created_at DESC",
  } satisfies IDiscussionBoardAdminAuditLog.IRequest;
  const emptyResult =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: emptyFilterRequest,
      },
    );
  typia.assert(emptyResult);
  // Should return empty array with zero records
  TestValidator.equals("empty result data array", emptyResult.data, []);
  TestValidator.equals(
    "empty result records count",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pages count",
    emptyResult.pagination.pages,
    0,
  );
  // 5. Test pagination with filtered results
  const paginationTestRequest = {
    action_type: "delete_article",
    page: 1,
    limit: 5,
    sort: "created_at DESC",
  } satisfies IDiscussionBoardAdminAuditLog.IRequest;
  const paginationResult =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: paginationTestRequest,
      },
    );
  typia.assert(paginationResult);
  // Verify current page is 1
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  // Verify limit is respected
  TestValidator.predicate(
    "pagination limit respected",
    paginationResult.data.length <= paginationTestRequest.limit,
  );
  // Verify all entries match the action type filter
  for (const log of paginationResult.data) {
    TestValidator.equals(
      "pagination filtered action_type matches",
      log.action_type,
      "delete_article",
    );
  }
  // 6. Test multiple entries with same action type
  const multiEntryRequest = {
    action_type: "create_section",
    page: 1,
    limit: 100,
    sort: "created_at DESC",
  } satisfies IDiscussionBoardAdminAuditLog.IRequest;
  const multiEntryResult =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: multiEntryRequest,
      },
    );
  typia.assert(multiEntryResult);
  // Verify all entries have the same action type
  const allSameActionType = multiEntryResult.data.every(
    (log) => log.action_type === "create_section",
  );
  TestValidator.predicate(
    "all entries have same action_type",
    allSameActionType,
  );
  // Verify pagination records count matches actual data length
  TestValidator.equals(
    "multi-entry pagination records accurate",
    multiEntryResult.pagination.records,
    multiEntryResult.data.length,
  );
}
