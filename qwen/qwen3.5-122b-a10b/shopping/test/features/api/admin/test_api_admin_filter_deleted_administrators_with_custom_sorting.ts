import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator listing with status filtering and custom sorting.
 *
 * Validates the administrator listing endpoint's filtering and sorting capabilities. Tests that administrators can view administrator accounts with various filter combinations and sorting options. Ensures that custom sorting (by email, created_at, updated_at) works correctly in both ascending and descending order, and that status filtering properly separates active from deleted accounts.
 *
 * This test creates multiple administrator accounts and verifies that the listing API correctly applies sorting and filtering parameters. It validates pagination metadata and ensures that sorting remains consistent across multiple requests.
 *
 * 1. Authenticate as administrator using authorize_admin_join.
 * 2. Create multiple administrator accounts with different emails.
 * 3. Test default listing (no filters, default sort by created_at desc).
 * 4. Test sorting by email in ascending order.
 * 5. Test sorting by email in descending order.
 * 6. Test sorting by updated_at in descending order.
 * 7. Test sorting by updated_at in ascending order.
 * 8. Test sorting by created_at in ascending order.
 * 9. Test status filter with "active" status.
 * 10. Test status filter with "deleted" status (may return empty).
 * 11. Verify pagination metadata is correct.
 * 12. Validate sorting consistency across multiple requests.
 */
export async function test_api_admin_filter_deleted_administrators_with_custom_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Create multiple administrator accounts for testing
  const testAdmins: IEcommerceAdmin.IAuthorized[] = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      const conn: api.IConnection = { host: connection.host };
      return await authorize_admin_join(conn, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceAdmin.IJoin,
      });
    },
  );
  // 3. Test default listing (no filters, default sort by created_at desc)
  const defaultList: IPageIEcommerceAdmin.ISummary =
    await api.functional.ecommerce.admin.admins.index(adminConnection, {
      body: {
        limit: 100,
        page: 1,
      } satisfies IEcommerceAdmin.IRequest,
    });
  typia.assert(defaultList);
  TestValidator.predicate(
    "default list has admins",
    defaultList.data.length > 0,
  );
  // 4. Test sorting by email in ascending order
  const emailAscList: IPageIEcommerceAdmin.ISummary =
    await api.functional.ecommerce.admin.admins.index(adminConnection, {
      body: {
        sort_by: "email",
        sort_order: "asc",
        limit: 100,
        page: 1,
      } satisfies IEcommerceAdmin.IRequest,
    });
  typia.assert(emailAscList);
  // Verify email sorting is ascending
  const emailAscSorted = emailAscList.data.every(
    (admin, index) =>
      index === 0 ||
      admin.email.localeCompare(emailAscList.data[index - 1].email) >= 0,
  );
  TestValidator.predicate("emails sorted ascending", emailAscSorted);
  // 5. Test sorting by email in descending order
  const emailDescList: IPageIEcommerceAdmin.ISummary =
    await api.functional.ecommerce.admin.admins.index(adminConnection, {
      body: {
        sort_by: "email",
        sort_order: "desc",
        limit: 100,
        page: 1,
      } satisfies IEcommerceAdmin.IRequest,
    });
  typia.assert(emailDescList);
  // Verify email sorting is descending
  const emailDescSorted = emailDescList.data.every(
    (admin, index) =>
      index === 0 ||
      admin.email.localeCompare(emailDescList.data[index - 1].email) <= 0,
  );
  TestValidator.predicate("emails sorted descending", emailDescSorted);
  // 6. Test sorting by updated_at in descending order
  const updatedDescList: IPageIEcommerceAdmin.ISummary =
    await api.functional.ecommerce.admin.admins.index(adminConnection, {
      body: {
        sort_by: "updated_at",
        sort_order: "desc",
        limit: 100,
        page: 1,
      } satisfies IEcommerceAdmin.IRequest,
    });
  typia.assert(updatedDescList);
  // Verify updated_at sorting is descending
  const updatedDescSorted = updatedDescList.data.every(
    (admin, index) =>
      index === 0 ||
      new Date(admin.updated_at).getTime() >=
        new Date(updatedDescList.data[index - 1].updated_at).getTime(),
  );
  TestValidator.predicate("updated_at sorted descending", updatedDescSorted);
  // 7. Test sorting by updated_at in ascending order
  const updatedAscList: IPageIEcommerceAdmin.ISummary =
    await api.functional.ecommerce.admin.admins.index(adminConnection, {
      body: {
        sort_by: "updated_at",
        sort_order: "asc",
        limit: 100,
        page: 1,
      } satisfies IEcommerceAdmin.IRequest,
    });
  typia.assert(updatedAscList);
  // Verify updated_at sorting is ascending
  const updatedAscSorted = updatedAscList.data.every(
    (admin, index) =>
      index === 0 ||
      new Date(admin.updated_at).getTime() <=
        new Date(updatedAscList.data[index - 1].updated_at).getTime(),
  );
  TestValidator.predicate("updated_at sorted ascending", updatedAscSorted);
  // 8. Test sorting by created_at in ascending order
  const createdAscList: IPageIEcommerceAdmin.ISummary =
    await api.functional.ecommerce.admin.admins.index(adminConnection, {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        limit: 100,
        page: 1,
      } satisfies IEcommerceAdmin.IRequest,
    });
  typia.assert(createdAscList);
  // Verify created_at sorting is ascending
  const createdAscSorted = createdAscList.data.every(
    (admin, index) =>
      index === 0 ||
      new Date(admin.created_at).getTime() <=
        new Date(createdAscList.data[index - 1].created_at).getTime(),
  );
  TestValidator.predicate("created_at sorted ascending", createdAscSorted);
  // 9. Test status filter with "active" status
  const activeList: IPageIEcommerceAdmin.ISummary =
    await api.functional.ecommerce.admin.admins.index(adminConnection, {
      body: {
        status: "active",
        limit: 100,
        page: 1,
      } satisfies IEcommerceAdmin.IRequest,
    });
  typia.assert(activeList);
  // Verify all returned admins are active (deleted_at is null)
  const allActive = activeList.data.every((admin) => admin.deleted_at === null);
  TestValidator.predicate(
    "all active status admins have null deleted_at",
    allActive,
  );
  // 10. Test status filter with "deleted" status
  const deletedList: IPageIEcommerceAdmin.ISummary =
    await api.functional.ecommerce.admin.admins.index(adminConnection, {
      body: {
        status: "deleted",
        limit: 100,
        page: 1,
      } satisfies IEcommerceAdmin.IRequest,
    });
  typia.assert(deletedList);
  // Verify all returned admins are deleted (deleted_at is not null)
  const allDeleted = deletedList.data.every(
    (admin) => admin.deleted_at !== null,
  );
  TestValidator.predicate(
    "all deleted status admins have non-null deleted_at",
    allDeleted,
  );
  // 11. Test pagination with sorting
  const paginatedList: IPageIEcommerceAdmin.ISummary =
    await api.functional.ecommerce.admin.admins.index(adminConnection, {
      body: {
        sort_by: "email",
        sort_order: "asc",
        limit: 2,
        page: 1,
      } satisfies IEcommerceAdmin.IRequest,
    });
  typia.assert(paginatedList);
  // Verify pagination metadata
  TestValidator.equals("page 1", paginatedList.pagination.current, 1);
  TestValidator.equals("limit 2", paginatedList.pagination.limit, 2);
  TestValidator.predicate("has records", paginatedList.pagination.records > 0);
  TestValidator.predicate("has pages", paginatedList.pagination.pages > 0);
  TestValidator.predicate(
    "data length matches limit or total",
    paginatedList.data.length <= paginatedList.pagination.limit,
  );
  // 12. Test combined filtering and sorting
  const combinedList: IPageIEcommerceAdmin.ISummary =
    await api.functional.ecommerce.admin.admins.index(adminConnection, {
      body: {
        status: "active",
        sort_by: "email",
        sort_order: "asc",
        limit: 100,
        page: 1,
      } satisfies IEcommerceAdmin.IRequest,
    });
  typia.assert(combinedList);
  // Verify combined filter and sort
  const combinedAllActive = combinedList.data.every(
    (admin) => admin.deleted_at === null,
  );
  TestValidator.predicate(
    "combined filter returns active admins",
    combinedAllActive,
  );
  const combinedEmailSorted = combinedList.data.every(
    (admin, index) =>
      index === 0 ||
      admin.email.localeCompare(combinedList.data[index - 1].email) >= 0,
  );
  TestValidator.predicate("combined sort is correct", combinedEmailSorted);
}
