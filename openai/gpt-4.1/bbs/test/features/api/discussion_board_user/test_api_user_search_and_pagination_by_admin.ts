import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";

/**
 * Verify that admin can search and paginate users with various filters and that
 * business logic for permissions, filtering, response structure, and pagination
 * meta are enforced.
 *
 * Steps:
 *
 * 1. Register discussion board admin, saving credential
 * 2. Create a set of users (here, mock: pre-existing users are assumed)
 * 3. As admin, search users with:
 *
 *    - No filter (expecting non-empty, full list result)
 *    - Partial email filter (expect only emails containing substring)
 *    - Pagination parameters (page/limit, edge values)
 * 4. Validate all responses for correct summary structure, matching only allowed
 *    fields, correct meta
 * 5. Attempt invalid pagination and confirm error is thrown
 */
export async function test_api_user_search_and_pagination_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin to get privileged context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(10);
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword as string &
          tags.MinLength<8> &
          tags.Format<"password">,
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
        ip: undefined,
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Assume users are pre-populated; search must return something.

  // 3. Query all users with no filter
  const allUsersRes = await api.functional.discussionBoard.admin.users.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(allUsersRes);
  TestValidator.predicate(
    "users list should not be empty",
    allUsersRes.data.length > 0,
  );
  TestValidator.predicate(
    "pagination meta should be >= 1 page",
    allUsersRes.pagination.pages >= 1,
  );
  allUsersRes.data.forEach((u) => {
    typia.assert(u);
    TestValidator.predicate(
      "user summary fields are present",
      !!u.id && !!u.email && !!u.created_at && !!u.updated_at,
    );
  });

  // 4. Search by partial email
  const sampleUser =
    allUsersRes.data.length > 0 ? allUsersRes.data[0] : undefined;
  if (sampleUser) {
    const emailFragment = sampleUser.email.slice(0, 5);
    const byEmailRes = await api.functional.discussionBoard.admin.users.index(
      connection,
      {
        body: {
          email: sampleUser.email,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
    typia.assert(byEmailRes);
    TestValidator.predicate(
      "filtered users contain only requested email",
      byEmailRes.data.every((u) => u.email === sampleUser.email),
    );
    // Also try substring/partial
    const byPartialEmail =
      await api.functional.discussionBoard.admin.users.index(connection, {
        body: { email: emailFragment } satisfies IDiscussionBoardUser.IRequest,
      });
    typia.assert(byPartialEmail);
    TestValidator.predicate(
      "filtered users match partial email",
      byPartialEmail.data.every((u) => u.email.includes(emailFragment)),
    );
  }

  // 5. Test pagination parameters (page/limit)
  const pagedRes = await api.functional.discussionBoard.admin.users.index(
    connection,
    {
      body: { page: 1, limit: 2 } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(pagedRes);
  TestValidator.equals(
    "pagination current page should be 1",
    pagedRes.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is correctly set to 2",
    pagedRes.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "paged data length does not exceed limit",
    pagedRes.data.length <= 2,
  );

  // 6. Invalid pagination: page 0
  await TestValidator.error("page 0 should issue error", async () => {
    await api.functional.discussionBoard.admin.users.index(connection, {
      body: { page: 0 } satisfies IDiscussionBoardUser.IRequest,
    });
  });
  // 7. Invalid pagination: limit > 100
  await TestValidator.error("limit > 100 should issue error", async () => {
    await api.functional.discussionBoard.admin.users.index(connection, {
      body: { limit: 101 } satisfies IDiscussionBoardUser.IRequest,
    });
  });
}
