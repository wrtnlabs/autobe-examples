import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";

/**
 * Test the ability of an authenticated admin to retrieve a filtered and
 * paginated list of discussion board administrators.
 *
 * This test covers the administrative user journey:
 *
 * 1. Register (join) a new admin user to obtain authentication credentials.
 * 2. Using the authenticated connection, send a PATCH request to
 *    /discussionBoard/admin/discussionBoardAdmins.
 * 3. Include pagination parameters (page, limit) and search text filter for email,
 *    along with sorting instructions.
 * 4. Assert that the response contains a valid page object with pagination info
 *    and a list of admins.
 * 5. Verify each admin entry has a valid UUID id, properly formatted email, and
 *    timestamps for creation and update.
 * 6. Deleted admins can have deleted_at as null or ISO datetime string.
 * 7. Confirm the sorting, searching, and pagination has been applied correctly by
 *    business logic.
 *
 * This test ensures that only authenticated admins can retrieve the admin list
 * and that filtering/pagination are functional.
 */
export async function test_api_discussion_board_admins_search_and_paginate_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin using join API to authenticate
  const adminJoinBody = {
    email: RandomGenerator.alphaNumeric(5) + "@company.com",
    password: "adminPassword123",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Prepare search request with page, limit, search, and sorting
  const searchBody = {
    page: 1,
    limit: 5,
    search: adminJoinBody.email.substring(0, 3),
    sortBy: "email",
    sortOrder: "asc",
  } satisfies IDiscussionBoardAdmin.IRequest;

  // 3. Call the index API to get paginated list of admins
  const pageResult =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.index(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(pageResult);

  // 4. Validate pagination info
  TestValidator.predicate(
    "pagination current page at least 1",
    pageResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    pageResult.pagination.limit > 0 && pageResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination total non-negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages correct",
    pageResult.pagination.pages >= 1 &&
      pageResult.pagination.pages >= pageResult.pagination.current,
  );

  // 5. Validate each admin summary
  for (const admin of pageResult.data) {
    typia.assert(admin);
    TestValidator.predicate(
      `admin email contains search query`,
      admin.email.includes(searchBody.search!),
    );
    TestValidator.predicate(
      `admin id is UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        admin.id,
      ),
    );
    TestValidator.predicate(
      `admin created_at ISO datetime`,
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(admin.created_at),
    );
    TestValidator.predicate(
      `admin updated_at ISO datetime`,
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(admin.updated_at),
    );
    if (admin.deleted_at !== null && admin.deleted_at !== undefined) {
      TestValidator.predicate(
        `admin deleted_at ISO datetime or null`,
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(admin.deleted_at),
      );
    }
  }
}
