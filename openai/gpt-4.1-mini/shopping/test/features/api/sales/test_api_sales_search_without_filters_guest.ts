import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_sales_search_without_filters_guest(
  connection: api.IConnection,
): Promise<void> {
  // Guest user - no authentication
  // Prepare default request body with no filters and pagination defaults
  const body: IShoppingMallSale.IRequest = {
    page: 1,
    limit: 10,
    name: undefined,
    categoryCode: undefined,
    price_min: undefined,
    price_max: undefined,
    inStock: undefined,
    sort: undefined,
  };
  // Use an actor-specific connection for guest user
  const guestConnection: api.IConnection = { host: connection.host };
  // Call the sales index API with empty filters
  const response = await api.functional.shoppingMall.sales.index(
    guestConnection,
    {
      body,
    },
  );
  // Assert the response type
  typia.assert(response);
  // Validate pagination metadata
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current page >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0", pagination.limit > 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  // Validate data array exists
  TestValidator.predicate(
    "response data is array",
    Array.isArray(response.data),
  );
  // Validate each sale summary in data array
  for (const sale of response.data) {
    typia.assert(sale);
    TestValidator.predicate(
      "sale id is uuid",
      /^[0-9a-fA-F-]{36}$/.test(sale.id),
    );
    TestValidator.predicate(
      "sale name is non-empty string",
      typeof sale.name === "string" && sale.name.length > 0,
    );
    TestValidator.predicate(
      "sale basePrice is number >= 0",
      typeof sale.basePrice === "number" && sale.basePrice >= 0,
    );
    TestValidator.predicate(
      "sale status is string and non-empty",
      typeof sale.status === "string" && sale.status.length > 0,
    );
    // Validate seller summary
    const seller = sale.seller;
    typia.assert(seller);
    TestValidator.predicate(
      "seller id is uuid",
      /^[0-9a-fA-F-]{36}$/.test(seller.id),
    );
    TestValidator.predicate(
      "seller email is non-empty string",
      typeof seller.email === "string" && seller.email.length > 0,
    );
    TestValidator.predicate(
      "seller shopName is non-empty string",
      typeof seller.shopName === "string" && seller.shopName.length > 0,
    );
    TestValidator.predicate(
      "seller approvalStatus is string and non-empty",
      typeof seller.approvalStatus === "string" &&
        seller.approvalStatus.length > 0,
    );
    // Validate category summary
    const category = sale.category;
    typia.assert(category);
    TestValidator.predicate(
      "category id is uuid",
      /^[0-9a-fA-F-]{36}$/.test(category.id),
    );
    TestValidator.predicate(
      "category name is non-empty string",
      typeof category.name === "string" && category.name.length > 0,
    );
    TestValidator.predicate(
      "category description is string",
      typeof category.description === "string",
    );
    TestValidator.predicate(
      "category created_at is date-time string",
      typeof category.created_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
          category.created_at,
        ),
    );
    TestValidator.predicate(
      "category updated_at is date-time string",
      typeof category.updated_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
          category.updated_at,
        ),
    );
    TestValidator.predicate(
      "category deleted_at is null or date-time string",
      category.deleted_at === null ||
        (typeof category.deleted_at === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
            category.deleted_at,
          )),
    );
  }
}
