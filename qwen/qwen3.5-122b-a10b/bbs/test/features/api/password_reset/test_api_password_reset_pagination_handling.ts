import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminPasswordReset";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test password reset pagination handling.
 *
 * Validates that password reset record retrieval correctly handles pagination
 * with proper metadata tracking and sorting. Tests multiple pagination scenarios
 * including different page numbers, limits, and boundary conditions.
 */
export async function test_api_password_reset_pagination_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to access password reset audit logs
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test pagination with default parameters (page 1, default limit)
  const page1 =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          type: "member",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(page1);
  // Validate pagination metadata structure
  TestValidator.predicate("pagination exists", page1.pagination !== undefined);
  TestValidator.predicate("data array exists", Array.isArray(page1.data));
  TestValidator.predicate(
    "current page is positive",
    page1.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", page1.pagination.limit >= 0);
  TestValidator.predicate(
    "records count is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    page1.pagination.pages >= 0,
  );
  // 3. Test pagination with different page numbers
  const page2 =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          type: "member",
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  // 4. Test pagination with different limits
  const pageSmallLimit =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          type: "member",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(pageSmallLimit);
  TestValidator.predicate(
    "small limit respected",
    pageSmallLimit.pagination.limit === 5,
  );
  TestValidator.predicate(
    "data respects limit",
    pageSmallLimit.data.length <= 5,
  );
  // 5. Test pagination with larger limit
  const pageLargeLimit =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          type: "member",
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(pageLargeLimit);
  TestValidator.predicate(
    "large limit respected",
    pageLargeLimit.pagination.limit === 50,
  );
  // 6. Test pagination with admin type filter
  const pageAdminType =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          type: "admin",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(pageAdminType);
  TestValidator.predicate(
    "admin type pagination works",
    pageAdminType.pagination !== undefined,
  );
  // 7. Test pagination with status filter
  const pageStatusFilter =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          type: "member",
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(pageStatusFilter);
  TestValidator.predicate(
    "status filter pagination works",
    pageStatusFilter.pagination !== undefined,
  );
  // 8. Test pagination with date range filters
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const pageDateRange =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          type: "member",
          created_at_from: thirtyDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(pageDateRange);
  TestValidator.predicate(
    "date range pagination works",
    pageDateRange.pagination !== undefined,
  );
  // 9. Validate pagination metadata consistency
  // pages should be calculated as ceil(records / limit)
  const expectedPages = Math.ceil(
    page1.pagination.records / page1.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation",
    page1.pagination.pages,
    expectedPages,
  );
  // 10. Validate data structure for each record
  for (const record of page1.data) {
    typia.assert(record);
    TestValidator.predicate("record has id", record.id !== undefined);
    TestValidator.predicate("record has admin", record.admin !== undefined);
    TestValidator.predicate(
      "record has expires_at",
      record.expires_at !== undefined,
    );
    TestValidator.predicate(
      "record has created_at",
      record.created_at !== undefined,
    );
    TestValidator.predicate(
      "record has updated_at",
      record.updated_at !== undefined,
    );
    TestValidator.predicate("admin has id", record.admin.id !== undefined);
    TestValidator.predicate(
      "admin has display_name",
      record.admin.display_name !== undefined,
    );
    TestValidator.predicate(
      "admin has grade",
      record.admin.grade !== undefined,
    );
  }
  // 11. Test boundary condition: page beyond available data
  const pageBeyond =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          type: "member",
          page: 999,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(pageBeyond);
  TestValidator.predicate(
    "beyond page has valid pagination",
    pageBeyond.pagination !== undefined,
  );
  TestValidator.predicate(
    "beyond page data is array",
    Array.isArray(pageBeyond.data),
  );
  // 12. Test sorting verification - records should be sorted by created_at descending
  if (page1.data.length > 1) {
    for (let i = 0; i < page1.data.length - 1; i++) {
      const current = new Date(page1.data[i].created_at).getTime();
      const next = new Date(page1.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `records sorted descending at index ${i}`,
        current >= next,
      );
    }
  }
  // 13. Test with search filter
  const pageSearch =
    await api.functional.discussionBoard.member.password_resets.index(
      memberConnection,
      {
        body: {
          type: "member",
          search: typia.random<string>(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminPasswordReset.IRequest,
      },
    );
  typia.assert(pageSearch);
  TestValidator.predicate(
    "search filter pagination works",
    pageSearch.pagination !== undefined,
  );
}
