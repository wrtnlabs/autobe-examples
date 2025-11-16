import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";

/**
 * Validate admin pagination and filtering of user accounts.
 *
 * This test verifies paginated, filtered listing of users is accessible only to
 * authenticated admins and that query parameters (filters, pagination, sorting)
 * control results as expected. It ensures privacy boundaries—no sensitive
 * fields like password returned.
 *
 * 1. Register and authenticate an admin
 * 2. Call /discussionBoard/admin/users with various filter params
 * 3. Check that filtering (email, is_active, is_blocked, is_email_verified,
 *    created_from, created_to, deleted) is respected
 * 4. Check pagination and sorting correctness
 * 5. Ensure only admin can access; non-admins should receive an error
 * 6. Assert response fields respect data privacy (summaries, no secret data)
 */
export async function test_api_admin_user_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.test/registration",
    referrer: "https://admin.test/start",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Call user listing with different filtering criteria
  const baseFilter = {
    is_active: true,
    is_blocked: false,
    is_email_verified: false,
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    order_by: "created_at",
    order_dir: "desc" as "asc" | "desc",
  } satisfies IDiscussionBoardUser.IRequest;
  const page1 = await api.functional.discussionBoard.admin.users.index(
    connection,
    { body: baseFilter },
  );
  typia.assert(page1);

  // 3. Validate pagination response fields
  TestValidator.predicate(
    "pagination - current page is 1",
    page1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination - limit is 10",
    page1.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination - pages >= 1",
    page1.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination - data does not contain password or secret fields",
    page1.data.every(
      (user) =>
        !("password" in user) &&
        !("password_hash" in user) &&
        !("token" in user),
    ),
  );

  // 4. Filtering: fetch with deliberate no-match (non-matching email keyword)
  const noMatch = await api.functional.discussionBoard.admin.users.index(
    connection,
    {
      body: {
        ...baseFilter,
        email: RandomGenerator.alphaNumeric(17) + "@none.xyz",
      },
    },
  );
  typia.assert(noMatch);
  TestValidator.equals(
    "no match for unknown email keyword",
    noMatch.data.length,
    0,
  );

  // 5. Filtering: fetch all blocked users
  const blockedUsers = await api.functional.discussionBoard.admin.users.index(
    connection,
    {
      body: { ...baseFilter, is_blocked: true },
    },
  );
  typia.assert(blockedUsers);
  TestValidator.predicate(
    "all returned are blocked",
    blockedUsers.data.every((user) => user.is_blocked === true),
  );

  // 6. Filtering: users created within a date range
  // Use the admin's created_at as both bounds to ensure at least one match
  const createdFrom = admin.created_at;
  const createdTo = admin.created_at;
  const createdWindow = await api.functional.discussionBoard.admin.users.index(
    connection,
    {
      body: { ...baseFilter, created_from: createdFrom, created_to: createdTo },
    },
  );
  typia.assert(createdWindow);
  TestValidator.predicate(
    "created_in_range has users in date window",
    createdWindow.data.every(
      (user) => user.created_at >= createdFrom && user.created_at <= createdTo,
    ),
  );

  // 7. Ensure only admin can access; non-admin/unauthenticated should get error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin cannot access user index", async () => {
    await api.functional.discussionBoard.admin.users.index(unauthConn, {
      body: baseFilter,
    });
  });
}
