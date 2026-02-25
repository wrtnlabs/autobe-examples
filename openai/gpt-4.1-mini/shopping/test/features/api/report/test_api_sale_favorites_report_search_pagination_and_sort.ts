import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleFavorite";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleFavorite";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an administrator can retrieve a paginated list of sale favorites with complex filtering, pagination, and sorting.
 * The test covers administrator authentication, querying with various filters, pagination boundaries, and sorting order validation.
 */
export async function test_api_sale_favorites_report_search_pagination_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin.${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "Admin@1234",
    },
  });
  typia.assert(adminJoin);
  // Step 2: Prepare a few requests with various combinations of search, pagination limit, page, and sort
  const testRequests: IShoppingMallSaleFavorite.IRequest[] = [
    { page: 1, limit: 10, sort: "created_at", search: "" },
    { page: 1, limit: 5, sort: "updated_at", search: "sale" },
    { page: 2, limit: 3, sort: "created_at", search: "customer" },
    { page: 1, limit: 15, sort: "deleted_at", search: "" },
  ];
  // Step 3: Call the endpoint for each request and validate responses
  for (const request of testRequests) {
    const response =
      await api.functional.shoppingMall.administrator.reports.sale_favorites.index(
        adminConnection,
        { body: request },
      );
    typia.assert(response);

    // Map sort keys from snake_case to camelCase using the actual response data type
    const sortKeyMap: Record<string, keyof typeof response.data[0] | undefined> = {
      created_at: "createdAt",
      updated_at: "updatedAt",
      deleted_at: "deletedAt",
    };

    // Validate pagination fields and data
    TestValidator.equals(
      "pagination current page",
      response.pagination.current,
      request.page ?? 1,
    );
    TestValidator.equals(
      "pagination limit",
      response.pagination.limit,
      request.limit ?? 10,
    );
    TestValidator.predicate(
      "pagination records non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "data length not exceeding limit",
      response.data.length <= (request.limit ?? 10),
    );
    // Validate each item properly constructed
    for (const item of response.data) {
      typia.assert(item);
      TestValidator.predicate(
        "item has createdAt",
        typeof item.createdAt === "string",
      );
      TestValidator.predicate(
        "item has a customer",
        item.customer !== null && typeof item.customer === "object",
      );
      TestValidator.predicate(
        "item has a sale",
        item.sale !== null && typeof item.sale === "object",
      );
    }
    // Validate sorting order according to the requested sort
    const sorted = [...response.data].sort((a, b) => {
      const sortKey =
        sortKeyMap[request.sort ?? "created_at"] ?? (request.sort as keyof typeof a);
      const aValue = (a[sortKey] ?? "") as any;
      const bValue = (b[sortKey] ?? "") as any;
      if (aValue < bValue) return -1;
      if (aValue > bValue) return 1;
      return 0;
    });
    TestValidator.equals(
      `sorted by ${request.sort ?? "created_at"}`,
      response.data.map((i) => i.id),
      sorted.map((i) => i.id),
    );
  }
}
