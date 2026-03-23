import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test complex filter combinations and edge cases for the administrator list endpoint.
 * 1. Authenticate as super administrator
 * 2. Test multiple filter combinations (grade, status, search)
 * 3. Test pagination edge cases (beyond pages, min/max limits)
 * 4. Verify sorting and response structure
 */
export async function test_api_admin_list_filter_combinations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "1234",
      href: "https://test.com/admin",
      referrer: "https://test.com/login",
    },
  });
  // 2. Test filter combination: grade='regular' AND status='active'
  const regularActiveResult =
    await api.functional.shoppingMall.admin.admins.index(adminConnection, {
      body: {
        grade: "regular",
        status: "active",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(regularActiveResult);
  TestValidator.equals(
    "filter grade=regular status=active returns valid pagination",
    regularActiveResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "all results are regular grade",
    regularActiveResult.data.every((admin) => admin.grade === "regular"),
  );
  TestValidator.predicate(
    "all results are active status",
    regularActiveResult.data.every((admin) => admin.status === "active"),
  );
  // 3. Test filter combination: grade='super' AND status='banned'
  const superBannedResult =
    await api.functional.shoppingMall.admin.admins.index(adminConnection, {
      body: {
        grade: "super",
        status: "banned",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(superBannedResult);
  TestValidator.predicate(
    "all results are super grade",
    superBannedResult.data.every((admin) => admin.grade === "super"),
  );
  TestValidator.predicate(
    "all results are banned status",
    superBannedResult.data.every((admin) => admin.status === "banned"),
  );
  // 4. Test filter with email search
  const searchResult = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: {
        search: "test",
        status: "suspended",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search results match email pattern",
    searchResult.data.every((admin) =>
      admin.email.toLowerCase().includes("test"),
    ),
  );
  TestValidator.predicate(
    "search results are suspended status",
    searchResult.data.every((admin) => admin.status === "suspended"),
  );
  // 5. Test empty search term (should return all)
  const emptySearchResult =
    await api.functional.shoppingMall.admin.admins.index(adminConnection, {
      body: {
        search: "",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search returns valid pagination",
    emptySearchResult.pagination.current >= 1,
  );
  // 6. Test non-existent email search (should return empty results)
  const nonExistentSearchResult =
    await api.functional.shoppingMall.admin.admins.index(adminConnection, {
      body: {
        search: "nonexistent123456789",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(nonExistentSearchResult);
  TestValidator.equals(
    "non-existent search returns empty data",
    nonExistentSearchResult.data.length,
    0,
  );
  // 7. Test pagination: page beyond total pages
  const beyondPageResult = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: {
        page: 9999,
        limit: 20,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(beyondPageResult);
  TestValidator.equals(
    "page beyond total returns empty data",
    beyondPageResult.data.length,
    0,
  );
  // 8. Test pagination: limit at maximum (100)
  const maxLimitResult = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit pagination reflects limit",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit returns at most 100 items",
    maxLimitResult.data.length <= 100,
  );
  // 9. Test pagination: limit at minimum (1)
  const minLimitResult = await api.functional.shoppingMall.admin.admins.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(minLimitResult);
  TestValidator.equals(
    "min limit pagination reflects limit",
    minLimitResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "min limit returns at most 1 item",
    minLimitResult.data.length <= 1,
  );
  // 10. Test sorting by email ascending
  const sortEmailAscResult =
    await api.functional.shoppingMall.admin.admins.index(adminConnection, {
      body: {
        sortBy: "email",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(sortEmailAscResult);
  TestValidator.predicate(
    "sort by email ascending is valid",
    sortEmailAscResult.pagination.current >= 1,
  );
  // 11. Test sorting by created_at descending
  const sortCreatedAtDescResult =
    await api.functional.shoppingMall.admin.admins.index(adminConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(sortCreatedAtDescResult);
  TestValidator.predicate(
    "sort by created_at descending is valid",
    sortCreatedAtDescResult.pagination.current >= 1,
  );
  // 12. Verify deleted_at is null for active accounts
  const activeAccountsResult =
    await api.functional.shoppingMall.admin.admins.index(adminConnection, {
      body: {
        status: "active",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(activeAccountsResult);
  TestValidator.predicate(
    "active accounts have null deleted_at",
    activeAccountsResult.data.every((admin) => admin.deleted_at === null),
  );
  // 13. Verify pagination metadata structure
  TestValidator.equals(
    "pagination has current page",
    typeof regularActiveResult.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof regularActiveResult.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records count",
    typeof regularActiveResult.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages count",
    typeof regularActiveResult.pagination.pages,
    "number",
  );
  // 14. Verify admin summary structure
  if (regularActiveResult.data.length > 0) {
    const firstAdmin = regularActiveResult.data[0];
    TestValidator.predicate(
      "admin has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstAdmin.id,
      ),
    );
    TestValidator.predicate(
      "admin has valid email format",
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
        firstAdmin.email,
      ),
    );
    TestValidator.predicate(
      "admin has valid grade",
      ["regular", "super"].includes(firstAdmin.grade),
    );
    TestValidator.predicate(
      "admin has valid status",
      ["active", "banned", "suspended"].includes(firstAdmin.status),
    );
  }
}
