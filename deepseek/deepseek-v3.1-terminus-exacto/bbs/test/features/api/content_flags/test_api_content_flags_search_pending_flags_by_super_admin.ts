import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the ability of a super administrator to search for pending content flags that require immediate moderation attention.
 * This scenario validates the core moderation workflow where super admins need to quickly identify unresolved flags.
 * The test verifies that the search correctly filters by status='pending', returns paginated results with proper metadata,
 * and includes essential flag information such as reporter details, flagged content references, and creation timestamps.
 */
export async function test_api_content_flags_search_pending_flags_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Update connection headers with authorization token
  superAdminConnection.headers = { Authorization: authResult.token.access };
  // Search for pending content flags with realistic pagination
  const searchResult =
    await api.functional.discussionBoard.superAdmin.content_flags.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination object exists",
    typeof searchResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is non-negative",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    searchResult.pagination.limit >= 1 && searchResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // Validate pagination calculations
  if (
    searchResult.pagination.limit > 0 &&
    searchResult.pagination.records > 0
  ) {
    const expectedPages = Math.ceil(
      searchResult.pagination.records / searchResult.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation is correct",
      searchResult.pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals(
      "zero records should have zero pages",
      searchResult.pagination.pages,
      0,
    );
  }
  // Validate each flag in the response
  for (const flag of searchResult.data) {
    typia.assert(flag);
    // Verify flag has required properties
    TestValidator.predicate(
      "flag has valid UUID ID",
      /^[0-9a-f-]{36}$/i.test(flag.id),
    );
    TestValidator.predicate(
      "flag has non-empty reason",
      flag.flag_reason.length > 0,
    );
    TestValidator.equals("flag status is pending", flag.status, "pending");
    TestValidator.predicate(
      "flag has valid creation timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(flag.created_at),
    );
    TestValidator.predicate(
      "flag has valid reporter user ID",
      /^[0-9a-f-]{36}$/i.test(flag.reporter_user_id),
    );
    // Verify either article or comment ID exists (but not both)
    const hasArticleId =
      flag.flagged_article_id !== null && flag.flagged_article_id !== undefined;
    const hasCommentId =
      flag.flagged_comment_id !== null && flag.flagged_comment_id !== undefined;
    TestValidator.predicate(
      "flag targets either article or comment",
      hasArticleId !== hasCommentId,
    );
    // Pending flags should not have resolution timestamp
    TestValidator.equals(
      "pending flag has no resolution timestamp",
      flag.resolved_at,
      null,
    );
  }
  // Test edge case: search with different pagination
  const secondPageResult =
    await api.functional.discussionBoard.superAdmin.content_flags.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(secondPageResult);
  // Validate second page results follow same rules
  for (const flag of secondPageResult.data) {
    typia.assert(flag);
    TestValidator.equals(
      "second page flag status is pending",
      flag.status,
      "pending",
    );
    TestValidator.equals(
      "second page flag has no resolution timestamp",
      flag.resolved_at,
      null,
    );
  }
}
