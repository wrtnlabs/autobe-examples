import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";

export async function test_api_admin_admins_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a privileged admin, preserve credentials
  const baseEmail = RandomGenerator.alphaNumeric(10) + "@autobetestmail.com";
  const baseDisplay = "Admin Test " + RandomGenerator.name();
  const mainAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: baseEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: baseDisplay,
      avatar_url: undefined,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(mainAdmin);
  const createdAdmins: IDiscussionBoardAdmin.IAuthorized[] = [mainAdmin];

  // 2. Create a diverse set of additional admins for filter/sort scenarios
  for (let i = 0; i < 8; ++i) {
    const admin = await api.functional.auth.admin.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(4)}${i}@autobetestmail.com`,
        password: RandomGenerator.alphaNumeric(14),
        display_name: `Admin${RandomGenerator.name(1)}-${i}`,
        avatar_url: undefined,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
    typia.assert(admin);
    // simulate state changes for locked/deleted
    if (i % 3 === 0 && admin.is_locked === false) {
      // Simulate locked account (real API would need an admin lock endpoint; here we check filter logic with is_locked)
      admin.is_locked = true as boolean;
    }
    if (i % 5 === 0) {
      // Simulate deleted account
      admin.deleted_at = new Date().toISOString() as string &
        tags.Format<"date-time">;
    }
    createdAdmins.push(admin);
  }

  // 3. Admin can find herself/himself via email exact filter
  let page = await api.functional.discussionBoard.admin.admins.index(
    connection,
    {
      body: { email: mainAdmin.email } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "returns exactly the specified admin on email filter",
    page.data.length === 1 && page.data[0].email === mainAdmin.email,
  );

  // 4. Filter by display name (partial, using first 5 chars)
  page = await api.functional.discussionBoard.admin.admins.index(connection, {
    body: {
      display_name: mainAdmin.display_name.substring(0, 5),
    } satisfies IDiscussionBoardAdmin.IRequest,
  });
  typia.assert(page);
  TestValidator.predicate(
    "display name partial search returns at least one correct admin",
    ArrayUtil.has(page.data, (adm) => adm.email === mainAdmin.email),
  );

  // 5. Search by generic substring (email substring)
  page = await api.functional.discussionBoard.admin.admins.index(connection, {
    body: {
      search: "testmail.com",
    } satisfies IDiscussionBoardAdmin.IRequest,
  });
  typia.assert(page);
  TestValidator.predicate(
    "global search term matches admins with email domain",
    page.data.some((adm) => adm.email.endsWith("@autobetestmail.com")),
  );

  // 6. Filter locked accounts
  page = await api.functional.discussionBoard.admin.admins.index(connection, {
    body: { is_locked: true } satisfies IDiscussionBoardAdmin.IRequest,
  });
  typia.assert(page);
  TestValidator.predicate(
    "filters locked admins",
    page.data.every((adm) => adm.is_locked === true),
  );

  // 7. Filter deleted accounts
  page = await api.functional.discussionBoard.admin.admins.index(connection, {
    body: {
      deleted_at:
        createdAdmins.find((adm) => adm.deleted_at != null)?.deleted_at ?? null,
    } satisfies IDiscussionBoardAdmin.IRequest,
  });
  typia.assert(page);
  TestValidator.predicate(
    "filters admins by deleted_at timestamp",
    page.data.every(
      (adm) => adm.deleted_at !== null && adm.deleted_at !== undefined,
    ),
  );

  // 8. Pagination: limit page to 3 per page
  page = await api.functional.discussionBoard.admin.admins.index(connection, {
    body: { limit: 3 } satisfies IDiscussionBoardAdmin.IRequest,
  });
  typia.assert(page);
  TestValidator.predicate(
    "pagination: data length <= limit",
    page.data.length <= 3,
  );
  TestValidator.predicate(
    "pagination: pagination meta reflects limit",
    page.pagination.limit === 3,
  );

  // 9. Sorting by created_at asc/desc
  for (const sort_order of ["asc", "desc"] as const) {
    page = await api.functional.discussionBoard.admin.admins.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order,
      } satisfies IDiscussionBoardAdmin.IRequest,
    });
    typia.assert(page);
    const times = page.data.map((adm) => new Date(adm.created_at).getTime());
    const sorted = [...times].sort((a, b) =>
      sort_order === "asc" ? a - b : b - a,
    );
    TestValidator.equals(
      `sort by created_at ${sort_order}: order must match`,
      times,
      sorted,
    );
  }

  // 10. Try unauthenticated (simulate logout by clearing access token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin listing must fail",
    async () => {
      await api.functional.discussionBoard.admin.admins.index(unauthConn, {
        body: {} as IDiscussionBoardAdmin.IRequest,
      });
    },
  );

  // 11. Try invalid search/filter/sort params
  for (const bad of [
    { page: 0 },
    { sort_by: "not_a_field" as any },
    { limit: 999 },
    { deleted_at: "not-a-timestamp" as any },
  ]) {
    await TestValidator.error(
      "invalid admin list params must fail",
      async () => {
        await api.functional.discussionBoard.admin.admins.index(connection, {
          body: bad as IDiscussionBoardAdmin.IRequest,
        });
      },
    );
  }
}
