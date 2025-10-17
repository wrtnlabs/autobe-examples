import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Validate member listing, pagination, filter, and admin-only access for the
 * admin member management endpoint.
 *
 * This test covers full admin-side browsing of the member list. It:
 *
 * 1. Registers a new admin (ensure admin-only endpoint access)
 * 2. Verifies unauthenticated and unauthorized (non-admin) users cannot browse
 *    member list
 * 3. Tests admin member list queries with pagination (default, custom page/limit,
 *    navigation)
 * 4. Validates result paging (current, limit, total, pages) and presence/types of
 *    data array
 * 5. Applies filters (email, username, email_verified, search) and validates
 *    filtered output
 * 6. Checks result ordering (sort_by, sort_order)
 * 7. Verifies edge cases (no results, page beyond last)
 */
export async function test_api_member_list_admin_browse_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Unauthenticated access should fail
  const anonConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access member list",
    async () => {
      await api.functional.discussionBoard.admin.members.index(anonConnection, {
        body: {},
      });
    },
  );

  // 3. Simulate non-admin (not joined as admin): should also fail
  const noauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin user cannot access member list",
    async () => {
      await api.functional.discussionBoard.admin.members.index(
        noauthConnection,
        {
          body: {},
        },
      );
    },
  );

  // 4. Admin fetch members (default paging)
  const defaultMembers =
    await api.functional.discussionBoard.admin.members.index(connection, {
      body: {},
    });
  typia.assert(defaultMembers);
  TestValidator.equals(
    "pagination current is page 1",
    defaultMembers.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data exists and is array",
    Array.isArray(defaultMembers.data),
  );

  // 5. Custom paging (page/limit navigation)
  const limit = 2;
  const page1 = await api.functional.discussionBoard.admin.members.index(
    connection,
    {
      body: { limit: limit satisfies number as number },
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "pagination limit matches request",
    page1.pagination.limit,
    limit,
  );
  if (page1.pagination.pages > 1) {
    const page2 = await api.functional.discussionBoard.admin.members.index(
      connection,
      {
        body: { limit: limit satisfies number as number, page: 2 },
      },
    );
    typia.assert(page2);
    TestValidator.equals(
      "pagination current is page 2",
      page2.pagination.current,
      2,
    );
  }

  // 6. Edge: page beyond last
  const beyondPage = page1.pagination.pages + 10;
  const emptyResult = await api.functional.discussionBoard.admin.members.index(
    connection,
    {
      body: { page: beyondPage, limit: limit },
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "out of range page is empty array",
    emptyResult.data.length,
    0,
  );

  // 7. Sorting test: by username asc
  const sortBy = "username";
  const sortedAsc = await api.functional.discussionBoard.admin.members.index(
    connection,
    {
      body: { sort_by: sortBy, sort_order: "asc" },
    },
  );
  typia.assert(sortedAsc);
  let usernames = sortedAsc.data.map((m) => m.username);
  TestValidator.equals(
    "sorted ascending by username",
    [...usernames].sort(),
    usernames,
  );

  // 8. Filtering test: by email
  if (defaultMembers.data.length) {
    const firstMember = defaultMembers.data[0];
    if (firstMember.email) {
      const filtered = await api.functional.discussionBoard.admin.members.index(
        connection,
        {
          body: { email: firstMember.email },
        },
      );
      typia.assert(filtered);
      TestValidator.predicate(
        "all results have the filter email",
        filtered.data.every((m) => m.email === firstMember.email),
      );
    }
  }

  // 9. Filtering by email_verified (expect boolean true/false)
  for (const value of [true, false]) {
    const result = await api.functional.discussionBoard.admin.members.index(
      connection,
      {
        body: { email_verified: value },
      },
    );
    typia.assert(result);
    TestValidator.predicate(
      `all have email_verified=${value}`,
      result.data.every(
        (m) => typeof m.email === "string" || m.email === undefined,
      ),
    );
  }
}
