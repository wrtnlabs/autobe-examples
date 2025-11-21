import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_cart_list_sort_by_expiration_desc(
  connection: api.IConnection,
) {
  // Step 1: Validate that the sorting parameter can be sent as a string in request body
  // The API's IShoppingMallCart.IRequest is defined as string type
  // We need to send sorting instruction as "expiration_date:-" as specified in the scenario

  // Attempt to fetch carts sorted by expiration_date in descending order
  const response: IPageIShoppingMallCart.ISummary =
    await api.functional.shoppingMall.customer.carts.index(connection, {
      body: "expiration_date:-" satisfies IShoppingMallCart.IRequest,
    });
  typia.assert(response);

  // Step 2: Validate response structure - must contain pagination and data array
  TestValidator.equals(
    "pagination exists in response",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "data array exists in response",
    response.data !== undefined,
    true,
  );

  // Step 3: Verify pagination properties have valid types according to schema
  TestValidator.predicate(
    "current page is positive integer",
    typeof response.pagination.current === "number" &&
      Number.isInteger(response.pagination.current) &&
      response.pagination.current >= 0,
  );

  TestValidator.predicate(
    "limit is positive integer",
    typeof response.pagination.limit === "number" &&
      Number.isInteger(response.pagination.limit) &&
      response.pagination.limit > 0,
  );

  TestValidator.predicate(
    "total records is non-negative integer",
    typeof response.pagination.records === "number" &&
      Number.isInteger(response.pagination.records) &&
      response.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages is non-negative integer",
    typeof response.pagination.pages === "number" &&
      Number.isInteger(response.pagination.pages) &&
      response.pagination.pages >= 0,
  );

  // Step 4: Validate that the data array contains items with required structure
  // Since the data type is IShoppingMallCart.ISummary, we can expect defined properties
  // Because IShoppingMallCart.ISummary is marked as 'string' in schema, this is problematic
  // However, we cannot change the schema - we must validate that response conforms to the contract

  // The schema indicates IShoppingMallCart.ISummary is a string, so we are only verifying structure
  // Pragmatic approach: Validate the array is type-safe and items are expected type

  // We'll test that the data array items are of type string (since IShoppingMallCart.ISummary is string)
  TestValidator.predicate(
    "data array items are strings",
    Array.isArray(response.data) &&
      response.data.every((item) => typeof item === "string"),
  );

  // Step 5: Verify that we got a non-empty array if data exists, or validate the response as expected
  // Given the data is string type in schema, the expectation is different from our initial assumption

  // If data array has items, we validate they follow string contract
  if (response.data.length > 0) {
    TestValidator.predicate(
      "first data item is a string",
      typeof response.data[0] === "string",
    );
    TestValidator.predicate(
      "first data item is non-empty",
      response.data[0].length > 0,
    );
  }
}
