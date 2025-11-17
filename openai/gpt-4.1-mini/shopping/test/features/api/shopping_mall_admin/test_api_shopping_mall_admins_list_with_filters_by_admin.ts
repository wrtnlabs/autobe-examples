import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_shopping_mall_admins_list_with_filters_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password: "StrongPassw0rd!",
        ip: null,
        href: "https://shopping-mall.example.com/admin/join",
        referrer: "https://shopping-mall.example.com/",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(authorizedAdmin);

  // 2. Prepare request body for filtered list with pagination and sorting
  const requestBody = {
    page: 1,
    limit: 10,
    search: email.substring(0, Math.min(10, email.length)), // Partial email for search
    sortField: "email",
    sortOrder: "asc",
  } satisfies IShoppingMallAdmin.IRequest;

  // 3. Call the admin list API to get filtered paginated admins
  const page: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.index(
      connection,
      {
        body: requestBody,
      },
    );

  // 4. Validate the pagination data structure
  typia.assert(page);
  const pagination: IPage.IPagination = page.pagination;
  TestValidator.predicate(
    "page pagination current page is positive",
    pagination.current > 0,
  );
  TestValidator.predicate(
    "page pagination limit is positive",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "page pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "page pagination pages is positive",
    pagination.pages > 0,
  );

  // 5. Validate the data list
  const data = page.data;
  TestValidator.predicate(
    "page data not empty and does not exceed limit",
    data.length <= pagination.limit,
  );

  // 6. Each admin entry validation
  for (const admin of data) {
    typia.assert(admin);
    TestValidator.predicate(
      "each admin id is uuid format",
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        admin.id,
      ),
    );
    TestValidator.predicate(
      "each admin email contains search keyword",
      admin.email.includes(requestBody.search ?? ""),
    );
  }

  // 7. Validate sorting: emails ascending
  for (let i = 1; i < data.length; i++) {
    TestValidator.predicate(
      `email at index ${i} >= email at index ${i - 1}`,
      data[i].email >= data[i - 1].email,
    );
  }
}
