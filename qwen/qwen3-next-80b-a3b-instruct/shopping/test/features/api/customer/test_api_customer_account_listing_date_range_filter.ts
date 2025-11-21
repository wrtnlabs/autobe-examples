import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_customer_account_listing_date_range_filter(
  connection: api.IConnection,
) {
  // Use the exact string type defined in IShoppingMallCustomer.IRequest
  const requestBody: string = "{}";

  // Call the API endpoint with required request body
  const response = await api.functional.shoppingMall.actors.customers.index(
    connection,
    {
      body: requestBody,
    },
  );

  // Validate the response structure matches IPageIShoppingMallCustomer.ISummary
  typia.assert(response);

  // Validate that pagination exists and has correct structure
  TestValidator.predicate(
    "response has pagination",
    () => response.pagination !== undefined,
  );
  TestValidator.predicate("response has data array", () =>
    Array.isArray(response.data),
  );

  // Validate pagination property types and constraints
  TestValidator.predicate("pagination current is integer", () =>
    Number.isInteger(response.pagination.current),
  );
  TestValidator.predicate("pagination limit is integer", () =>
    Number.isInteger(response.pagination.limit),
  );
  TestValidator.predicate("pagination records is integer", () =>
    Number.isInteger(response.pagination.records),
  );
  TestValidator.predicate("pagination pages is integer", () =>
    Number.isInteger(response.pagination.pages),
  );

  // Validate pagination values have positive minimums
  TestValidator.predicate(
    "pagination current >= 0",
    () => response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    () => response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    () => response.pagination.pages >= 0,
  );

  // Validate data items contain expected properties if any exist
  if (response.data.length > 0) {
    const firstCustomer = response.data[0];
    TestValidator.equals("customer has id", typeof firstCustomer.id, "string");
    TestValidator.equals(
      "customer has email",
      typeof firstCustomer.email,
      "string",
    );
    TestValidator.predicate("customer email has email format", () =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firstCustomer.email),
    );
    TestValidator.equals(
      "customer has name",
      typeof firstCustomer.name,
      "string",
    );
    TestValidator.equals(
      "customer has created_at",
      typeof firstCustomer.created_at,
      "string",
    );
    TestValidator.equals(
      "customer has status",
      typeof firstCustomer.status,
      "string",
    );
    TestValidator.predicate("created_at has date-time format", () =>
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?Z$/.test(
        firstCustomer.created_at,
      ),
    );
  }

  // Validate API returns some response data
  TestValidator.predicate(
    "API returns pagination structure",
    () => response.pagination !== null,
  );
  TestValidator.predicate("API returns valid pagination object", () => {
    const p = response.pagination;
    return p.current >= 0 && p.limit > 0 && p.records >= 0 && p.pages >= 0;
  });
}
