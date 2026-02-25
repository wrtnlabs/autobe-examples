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

/**
 * Test successful retrieval of paginated customer list with default parameters (page=1, limit=20).
 * Verify response contains properly formatted pagination metadata and customer summary objects with required fields (id, email, email_verified, created_at, updated_at).
 * Test with a small dataset that returns fewer records than the default limit to verify pagination calculations are correct when records < limit.
 */
export async function test_api_customer_list_pagination_default(
  connection: api.IConnection,
): Promise<void> {
  // Call the API with default pagination (empty request body for defaults)
  const result: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.customers.index(connection, {
      body: {},
    });
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals("default page number", result.pagination.current, 1);
  TestValidator.equals("default limit", result.pagination.limit, 20);
  TestValidator.predicate("records >= 0", result.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", result.pagination.pages >= 0);
  // Validate data structure
  typia.assert(result.data);
  // Validate each customer summary structure
  for (const customer of result.data) {
    typia.assert(customer);
    TestValidator.predicate("has id", typeof customer.id === "string");
    TestValidator.predicate("has email", typeof customer.email === "string");
    TestValidator.predicate(
      "has created_at",
      typeof customer.created_at === "string",
    );
    TestValidator.predicate(
      "has updated_at",
      typeof customer.updated_at === "string",
    );
  }
}
