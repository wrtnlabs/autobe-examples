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

export async function test_api_super_admin_email_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create test super administrators with different email patterns
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdmin1 = await authorize_super_admin_join(adminConnection, {
    body: {
      email: "admin.test1@gmail.com",
      password: "Password123!",
      name: "Super Admin Test 1",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin1);
  const superAdmin2 = await authorize_super_admin_join(adminConnection, {
    body: {
      email: "admin.test2@gmail.com",
      password: "Password123!",
      name: "Super Admin Test 2",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin2);
  const superAdmin3 = await authorize_super_admin_join(adminConnection, {
    body: {
      email: "super.admin3@yahoo.com",
      password: "Password123!",
      name: "Super Admin Test 3",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin3);
  // 2. Create a new connection for testing (using first admin's token)
  const testConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.superAdmin.login(testConnection, {
    body: {
      email: "admin.test1@gmail.com",
      password: "Password123!",
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // 3. Test: Filter by partial email "admin"
  const filteredAdmins =
    await api.functional.discussionBoard.superAdmin.super_admins.index(
      testConnection,
      {
        body: {
          email: "admin",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(filteredAdmins);
  // 4. Validate results
  TestValidator.equals(
    "should return matching admins",
    filteredAdmins.data.length,
    3,
  );
  TestValidator.predicate("all results contain 'admin' in email", () =>
    filteredAdmins.data.every((admin) =>
      admin.email.toLowerCase().includes("admin"),
    ),
  );
  // 5. Test: Filter by partial email "gmail"
  const gmailAdmins =
    await api.functional.discussionBoard.superAdmin.super_admins.index(
      testConnection,
      {
        body: {
          email: "gmail",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(gmailAdmins);
  TestValidator.equals(
    "should return gmail admins",
    gmailAdmins.data.length,
    2,
  );
  TestValidator.predicate("all results are gmail users", () =>
    gmailAdmins.data.every((admin) =>
      admin.email.toLowerCase().includes("gmail.com"),
    ),
  );
  // 6. Test: Filter by specific email "test1"
  const test1Admins =
    await api.functional.discussionBoard.superAdmin.super_admins.index(
      testConnection,
      {
        body: {
          email: "test1",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(test1Admins);
  TestValidator.equals(
    "should return only test1 admin",
    test1Admins.data.length,
    1,
  );
  TestValidator.equals(
    "email should match exactly",
    test1Admins.data[0].email,
    "admin.test1@gmail.com",
  );
  // 7. Test: Pagination validation
  const paginatedResult =
    await api.functional.discussionBoard.superAdmin.super_admins.index(
      testConnection,
      {
        body: {
          email: "admin",
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals("should respect limit", paginatedResult.data.length, 2);
  TestValidator.equals(
    "pagination should reflect limits",
    paginatedResult.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination should show correct current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination should show total records",
    paginatedResult.pagination.records,
    3,
  );
}
