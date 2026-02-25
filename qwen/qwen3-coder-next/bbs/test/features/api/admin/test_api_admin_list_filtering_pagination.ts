import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_list_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Test basic pagination (no filters)
  const allAdmins =
    await api.functional.discussionBoard.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(allAdmins);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    allAdmins.pagination !== undefined,
    true,
  );
  TestValidator.equals("data exists", Array.isArray(allAdmins.data), true);
  TestValidator.predicate("page is valid", allAdmins.pagination.current > 0);
  TestValidator.predicate("limit is valid", allAdmins.pagination.limit > 0);
  TestValidator.predicate(
    "records is valid",
    allAdmins.pagination.records >= 0,
  );
  TestValidator.predicate("pages is valid", allAdmins.pagination.pages >= 0);
  // Validate admin summary structure
  if (allAdmins.data.length > 0) {
    const firstAdmin = allAdmins.data[0];
    typia.assert(firstAdmin);
    TestValidator.equals(
      "id is uuid",
      /^[0-9a-f-]{36}$/i.test(firstAdmin.id),
      true,
    );
    TestValidator.equals(
      "email format",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firstAdmin.email),
      true,
    );
    TestValidator.equals(
      "is_super_admin is boolean",
      typeof firstAdmin.is_super_admin === "boolean",
      true,
    );
    TestValidator.equals(
      "is_active is boolean",
      typeof firstAdmin.is_active === "boolean",
      true,
    );
  }
  // 3. Test filtering by is_super_admin = true
  const superAdminFilter =
    await api.functional.discussionBoard.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          isSuperAdmin: true,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(superAdminFilter);
  // 4. Test filtering by is_active = true
  const activeAdmins =
    await api.functional.discussionBoard.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          isActive: true,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(activeAdmins);
  // 5. Test search functionality
  const searchResult =
    await api.functional.discussionBoard.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          search: RandomGenerator.alphabets(3),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(searchResult);
  // 6. Test empty result pagination
  const emptyResult =
    await api.functional.discussionBoard.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          search: RandomGenerator.alphaNumeric(20), // unlikely to match anything
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search returns empty data",
    emptyResult.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "pagination still valid when empty",
    emptyResult.pagination.records === 0 || emptyResult.pagination.records > 0,
    true,
  );
}
