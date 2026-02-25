import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator search and filter functionality.
 * 1. Create multiple super administrators for testing
 * 2. Call search endpoint with various filters
 * 3. Verify pagination and filtering work correctly
 * 4. Test unauthorized access
 */
export async function test_api_super_admin_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator accounts for testing
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(adminConnection, {
    body: {
      email: "admin1@test.com",
      password: "Test1234!@#$",
      name: "Super Admin 1",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  await authorize_super_admin_join(adminConnection, {
    body: {
      email: "admin2@test.com",
      password: "Test1234!@#$",
      name: "Admin Two",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  await authorize_super_admin_join(adminConnection, {
    body: {
      email: "test@example.com",
      password: "Test1234!@#$",
      name: "Test Admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Test search with email filter
  const emailSearch: IDiscussionBoardSuperAdmin.IRequest = {
    email: "admin1@test.com" as string,
    isActive: true,
    isSuperAdmin: true,
    sortBy: "created_at",
    sortOrder: "asc",
    page: 1,
    limit: 10,
  };
  const emailFiltered: IPageIDiscussionBoardSuperAdmin.ISummary =
    await api.functional.discussionBoard.superAdmin.super_admins.index(
      adminConnection,
      { body: emailSearch },
    );
  typia.assert(emailFiltered);
  // Verify email filter worked
  TestValidator.equals(
    "email filter returns matching admins",
    emailFiltered.data.length,
    1,
  );
  // 3. Test search with name filter
  const nameSearch: IDiscussionBoardSuperAdmin.IRequest = {
    name: "Admin",
    isActive: true,
    isSuperAdmin: true,
    sortBy: "created_at",
    sortOrder: "asc",
    page: 1,
    limit: 10,
  };
  const nameFiltered: IPageIDiscussionBoardSuperAdmin.ISummary =
    await api.functional.discussionBoard.superAdmin.super_admins.index(
      adminConnection,
      { body: nameSearch },
    );
  typia.assert(nameFiltered);
  // Verify name filter returned multiple results
  TestValidator.predicate(
    "name filter returns multiple admins",
    nameFiltered.data.length >= 2,
  );
  // 4. Test pagination
  const paginationSearch: IDiscussionBoardSuperAdmin.IRequest = {
    isActive: true,
    isSuperAdmin: true,
    sortBy: "created_at",
    sortOrder: "desc",
    page: 1,
    limit: 2,
  };
  const page1: IPageIDiscussionBoardSuperAdmin.ISummary =
    await api.functional.discussionBoard.superAdmin.super_admins.index(
      adminConnection,
      { body: paginationSearch },
    );
  typia.assert(page1);
  TestValidator.equals("first page limit", page1.data.length, 2);
  TestValidator.predicate(
    "pagination has correct total records",
    page1.pagination.records >= 3,
  );
  // 5. Test active status filter
  const activeSearch: IDiscussionBoardSuperAdmin.IRequest = {
    isActive: true,
    isSuperAdmin: true,
    sortBy: "created_at",
    sortOrder: "asc",
    page: 1,
    limit: 100,
  };
  const activeOnly: IPageIDiscussionBoardSuperAdmin.ISummary =
    await api.functional.discussionBoard.superAdmin.super_admins.index(
      adminConnection,
      { body: activeSearch },
    );
  typia.assert(activeOnly);
  // Verify all returned admins are active
  TestValidator.predicate(
    "all filtered admins are active",
    activeOnly.data.every((admin) => admin !== null),
  );
  // 6. Test sorting
  const sortedSearch: IDiscussionBoardSuperAdmin.IRequest = {
    isActive: true,
    isSuperAdmin: true,
    sortBy: "email",
    sortOrder: "asc",
    page: 1,
    limit: 100,
  };
  const sortedResult: IPageIDiscussionBoardSuperAdmin.ISummary =
    await api.functional.discussionBoard.superAdmin.super_admins.index(
      adminConnection,
      { body: sortedSearch },
    );
  typia.assert(sortedResult);
  // Verify emails are sorted alphabetically
  const emails = sortedResult.data.map((admin) => admin.email);
  const sortedEmails = [...emails].sort();
  TestValidator.equals(
    "emails are sorted alphabetically",
    emails,
    sortedEmails,
  );
  // 7. Test unauthorized access
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "should reject unauthorized access",
    async () =>
      await api.functional.discussionBoard.superAdmin.super_admins.index(
        unauthorizedConnection,
        {
          body: {
            isActive: true,
            isSuperAdmin: true,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardSuperAdmin.IRequest,
        },
      ),
  );
}
