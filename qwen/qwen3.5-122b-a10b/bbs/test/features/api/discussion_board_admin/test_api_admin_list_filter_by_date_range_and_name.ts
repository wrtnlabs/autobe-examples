import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test complex filtering with multiple parameters including date range and partial name/email matching.
 * A super administrator should be able to combine filters: created_at_from and created_at_to for
 * date range filtering, display_name for partial name matching, and email for partial email matching.
 * Verify that all filters are applied correctly with AND logic. Test sorting by different fields
 * (created_at, display_name, grade) with both ascending and descending order. Verify pagination
 * works correctly with filtered results.
 */
export async function test_api_admin_list_filter_by_date_range_and_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "Super Admin",
      bio: "Super administrator account",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create multiple admin accounts with different dates and names
  const baseDate = new Date();
  const admins: IDiscussionBoardAdmin.IAuthorized[] = [];
  // Create 7 admins with staggered dates over the past 30 days
  await ArrayUtil.asyncRepeat(7, async (index) => {
    const daysAgo = 30 - index * 4; // 30, 26, 22, 18, 14, 10, 6 days ago
    const createdAt = new Date(
      baseDate.getTime() - daysAgo * 24 * 60 * 60 * 1000,
    );
    const admin = await authorize_admin_join(
      { host: connection.host },
      {
        body: {
          email: `admin${index + 1}@test.com`,
          password: RandomGenerator.alphaNumeric(16),
          display_name: `Admin User ${index + 1}`,
          bio: `Administrator ${index + 1} bio`,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardAdmin.IJoin,
      },
    );
    typia.assert(admin);
    admins.push(admin);
  });
  // 3. Test date range filtering
  const dateFrom = new Date(
    baseDate.getTime() - 20 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateTo = new Date(
    baseDate.getTime() - 10 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeResult =
    await api.functional.discussionBoard.admin.admins.index(
      superAdminConnection,
      {
        body: {
          created_at_from: dateFrom,
          created_at_to: dateTo,
        } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Verify date range filtering works
  TestValidator.predicate(
    "date range filtering returns correct count",
    dateRangeResult.data.length > 0,
  );
  TestValidator.predicate(
    "all results within date range",
    dateRangeResult.data.every(
      (admin) => admin.created_at >= dateFrom && admin.created_at <= dateTo,
    ),
  );
  // 4. Test partial name matching
  const nameFilterResult =
    await api.functional.discussionBoard.admin.admins.index(
      superAdminConnection,
      {
        body: {
          display_name: "Admin User 1",
        } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(nameFilterResult);
  TestValidator.predicate(
    "name filtering returns matching results",
    nameFilterResult.data.length > 0,
  );
  TestValidator.predicate(
    "all results contain filter text",
    nameFilterResult.data.every((admin) =>
      admin.display_name.includes("Admin User 1"),
    ),
  );
  // 5. Test partial email matching
  const emailFilterResult =
    await api.functional.discussionBoard.admin.admins.index(
      superAdminConnection,
      {
        body: {
          email: "admin2@test.com",
        } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(emailFilterResult);
  TestValidator.predicate(
    "email filtering returns matching results",
    emailFilterResult.data.length > 0,
  );
  TestValidator.predicate(
    "all results contain filter email",
    emailFilterResult.data.every((admin) =>
      admin.email.includes("admin2@test.com"),
    ),
  );
  // 6. Test combined filters with AND logic
  const combinedFilterResult =
    await api.functional.discussionBoard.admin.admins.index(
      superAdminConnection,
      {
        body: {
          display_name: "Admin User 3",
          created_at_from: dateFrom,
          created_at_to: dateTo,
        } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filters apply AND logic",
    combinedFilterResult.data.every(
      (admin) =>
        admin.display_name.includes("Admin User 3") &&
        admin.created_at >= dateFrom &&
        admin.created_at <= dateTo,
    ),
  );
  // 7. Test sorting by created_at (descending)
  const sortByCreatedAtDesc =
    await api.functional.discussionBoard.admin.admins.index(
      superAdminConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(sortByCreatedAtDesc);
  TestValidator.predicate(
    "created_at descending sort is correct",
    sortByCreatedAtDesc.data.length < 2 ||
      sortByCreatedAtDesc.data.every((admin, index) => {
        if (index === 0) return true;
        return (
          admin.created_at <= sortByCreatedAtDesc.data[index - 1].created_at
        );
      }),
  );
  // 8. Test sorting by display_name (ascending)
  const sortByDisplayNameAsc =
    await api.functional.discussionBoard.admin.admins.index(
      superAdminConnection,
      {
        body: {
          sort_by: "display_name",
          sort_order: "asc",
        } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(sortByDisplayNameAsc);
  TestValidator.predicate(
    "display_name ascending sort is correct",
    sortByDisplayNameAsc.data.length < 2 ||
      sortByDisplayNameAsc.data.every((admin, index) => {
        if (index === 0) return true;
        return (
          admin.display_name >=
          sortByDisplayNameAsc.data[index - 1].display_name
        );
      }),
  );
  // 9. Test pagination with filtered results
  const paginationResult =
    await api.functional.discussionBoard.admin.admins.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 3,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit respected",
    paginationResult.data.length,
    Math.min(3, paginationResult.pagination.records),
  );
  TestValidator.equals(
    "pagination current page correct",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    paginationResult.pagination.pages > 0,
  );
  // 10. Test sorting by grade
  const sortByGrade = await api.functional.discussionBoard.admin.admins.index(
    superAdminConnection,
    {
      body: {
        sort_by: "grade",
        sort_order: "asc",
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(sortByGrade);
  TestValidator.predicate(
    "grade sorting returns results",
    sortByGrade.data.length > 0,
  );
}
