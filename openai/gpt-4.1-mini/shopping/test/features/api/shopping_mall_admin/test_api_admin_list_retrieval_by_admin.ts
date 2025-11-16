import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_list_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as an admin user via the join operation
  const adminCreate: IShoppingMallAdmin.ICreate = {
    email: `admin${RandomGenerator.alphaNumeric(5)}@company.com`,
    name: RandomGenerator.name(),
    password: "AdminPass123!",
    phone_number: RandomGenerator.mobile(),
    role: "admin",
  };

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  typia.assert(authorizedAdmin);

  // 2. Retrieve a filtered, paginated list of admins
  const requestBody: IShoppingMallAdmin.IRequest = {
    page: 1,
    limit: 10,
    search: adminCreate.email.substring(0, 5),
    sort_by: "created_at",
    sort_order: "desc",
  };

  const adminListPage: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: requestBody,
    });
  typia.assert(adminListPage);

  // 3. Validate pagination info
  TestValidator.predicate(
    "page number is 1 or greater",
    adminListPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit count is between 1 and 100",
    adminListPage.pagination.limit >= 1 &&
      adminListPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "number of pages is at least 1",
    adminListPage.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "records count is non-negative",
    adminListPage.pagination.records >= 0,
  );

  // 4. Validate the returned data
  TestValidator.predicate(
    "admin list data length is under limit",
    adminListPage.data.length <= requestBody.limit,
  );

  // 5. Validate each admin summary object
  for (const admin of adminListPage.data) {
    typia.assert(admin);

    TestValidator.predicate(
      "admin email contains search term",
      admin.email.includes(requestBody.search ?? ""),
    );

    TestValidator.predicate(
      "admin name is non-empty",
      typeof admin.name === "string" && admin.name.length > 0,
    );

    TestValidator.predicate(
      "admin is_active is boolean",
      typeof admin.is_active === "boolean",
    );
  }
}
