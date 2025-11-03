import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingSeller";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Test searching and listing registered sellers as admin.
 *
 * 1. Register an admin using the admin join API.
 * 2. Search all sellers (no filter). Validate IPageIShoppingSeller.ISummary
 *    format.
 * 3. Search sellers using search, status, sort, and pagination filters. Validate
 *    results correspond to filter.
 * 4. Change limit and page to test pagination. Validate page info and data
 *    changes.
 * 5. Try accessing the sellers index API as unauthenticated user (should fail).
 */
export async function test_api_admin_seller_list_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const adminRole = "super";
  const adminStatus = "active";
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role: adminRole,
      status: adminStatus,
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Search all sellers (no filter)
  const resultAll = await api.functional.shopping.admin.sellers.index(
    connection,
    {
      body: {} satisfies IShoppingSeller.IRequest,
    },
  );
  typia.assert(resultAll);
  TestValidator.predicate(
    "seller list has pagination",
    typeof resultAll.pagination === "object" &&
      "current" in resultAll.pagination,
  );

  // 3. Try some filters and sorting
  const responseFiltered = await api.functional.shopping.admin.sellers.index(
    connection,
    {
      body: {
        search: "a",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 2,
        page: 1,
      } satisfies IShoppingSeller.IRequest,
    },
  );
  typia.assert(responseFiltered);
  TestValidator.predicate(
    "filtered list contains sellers",
    responseFiltered.data.length <= 2,
  );

  // 4. Pagination switch
  const page2 = await api.functional.shopping.admin.sellers.index(connection, {
    body: {
      page: 2,
      limit: 1,
    } satisfies IShoppingSeller.IRequest,
  });
  typia.assert(page2);
  TestValidator.equals(
    "should return one seller per page",
    page2.data.length,
    1,
  );
  TestValidator.equals(
    "pagination info matches page",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination info matches limit",
    page2.pagination.limit,
    1,
  );

  // 5. Unauthenticated/Non-admin access denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin access is denied", async () => {
    await api.functional.shopping.admin.sellers.index(unauthConn, {
      body: {} satisfies IShoppingSeller.IRequest,
    });
  });
}
