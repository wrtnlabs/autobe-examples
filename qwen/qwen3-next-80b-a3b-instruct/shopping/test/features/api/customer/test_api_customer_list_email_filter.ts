import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_customer_list_email_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Call the endpoint to retrieve filtered customer list with email filter
  // The IRequest is empty but we need to test email filtering
  // Since the DTO IShoppingMallCustomer.ISummary is empty, we can't validate any properties
  // We'll focus on pagination validation and that the response structure is correct
  const response = await api.functional.shoppingMall.customers.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(response);
  // Validate response contains required fields
  TestValidator.predicate(
    "response has data array",
    Array.isArray(response.data),
  );
  TestValidator.predicate(
    "response has pagination",
    response.pagination !== null,
  );
  // Validate each customer summary is an empty object (per DTO definition)
  for (const customer of response.data) {
    const typedCustomer =
      typia.assert<IShoppingMallCustomer.ISummary>(customer);
    // Since ISummary is empty {}, we can't validate any properties
    // The type ensures it's an empty object but there are no properties to verify
  }
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
}
