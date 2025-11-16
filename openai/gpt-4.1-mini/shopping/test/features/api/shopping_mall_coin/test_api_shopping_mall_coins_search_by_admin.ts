import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCoin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoin";

export async function test_api_shopping_mall_coins_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminCreateBody = {
    email: "admin@example.com",
    name: "Admin User",
    password: "SecurePass123!",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Search shopping mall coin with pagination, search and order
  const searchRequests: IShoppingMallCoin.IRequest[] = [
    // Normal pagination
    { page: 1, limit: 10 },
    // Pagination with search filter
    { page: 2, limit: 5, search: admin.email },
    // Pagination with order ascending
    { page: 1, limit: 15, orderBy: "created_at", orderDirection: "asc" },
    // Pagination with order descending
    { page: 1, limit: 15, orderBy: "amount", orderDirection: "desc" },
    // Pagination with all filters
    {
      page: 3,
      limit: 7,
      search: "coin",
      orderBy: "shopping_mall_channel_id",
      orderDirection: "asc",
    },
  ];

  for (const reqBody of searchRequests) {
    const output: IPageIShoppingMallCoin.ISummary =
      await api.functional.shoppingMall.admin.shoppingMallCoins.index(
        connection,
        {
          body: reqBody,
        },
      );
    typia.assert(output);

    // Validate pagination object
    TestValidator.predicate(
      "pagination current page at least 1",
      output.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit positive",
      output.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination pages not less than current",
      output.pagination.pages >= output.pagination.current,
    );
    TestValidator.predicate(
      "pagination records not negative",
      output.pagination.records >= 0,
    );

    // Validate data array
    for (const coinSummary of output.data) {
      typia.assert(coinSummary);
      TestValidator.predicate(
        "coin amount is a number",
        typeof coinSummary.amount === "number",
      );
      TestValidator.predicate(
        "shopping mall channel id is uuid",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          coinSummary.shopping_mall_channel_id,
        ),
      );
      TestValidator.predicate(
        "shopping mall customer id is uuid",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          coinSummary.shopping_mall_customer_id,
        ),
      );
      TestValidator.predicate(
        "created_at date-time string",
        typeof coinSummary.created_at === "string" &&
          coinSummary.created_at.length > 0,
      );
      TestValidator.predicate(
        "updated_at date-time string",
        typeof coinSummary.updated_at === "string" &&
          coinSummary.updated_at.length > 0,
      );
      if (
        coinSummary.deleted_at !== null &&
        coinSummary.deleted_at !== undefined
      ) {
        TestValidator.predicate(
          "deleted_at date-time string",
          typeof coinSummary.deleted_at === "string" &&
            coinSummary.deleted_at.length > 0,
        );
      }
    }
  }
}
