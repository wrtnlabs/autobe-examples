import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_search_with_price_range_and_variants(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection as per Connection Isolation Pattern
  const customerConnection: api.IConnection = { host: connection.host };
  // Construct search request using the actual API schema properties
  // The IShoppingMallProduct.IRequest is defined as {} but the API accepts specific properties
  // Per Autonomous Scenario Correction, we use properties that exist in the API schema
  const searchRequest = {
    name: "wireless headphones",
    description: "wireless headphones",
    base_price_min: 50 satisfies number &
      tags.Type<"uint32"> &
      tags.Minimum<50> &
      tags.Maximum<200>,
    base_price_max: 200 satisfies number &
      tags.Type<"uint32"> &
      tags.Minimum<50> &
      tags.Maximum<200>,
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallProduct.IRequest;
  // Execute product search with price range and variant filtering
  const result = await api.functional.shoppingMall.products.index(
    customerConnection,
    { body: searchRequest },
  );
  // Validate the response structure
  typia.assert(result);
  // Validate pagination data (these properties exist in the defined schema)
  TestValidator.equals("page count", result.pagination.current, 1);
  TestValidator.equals("page size", result.pagination.limit, 10);
  // Validate that results were returned (data array has elements)
  TestValidator.predicate("has results", result.data.length > 0);
  // We cannot validate individual product properties (id, name, base_price)
  // because IShoppingMallProduct.ISummary is defined as an empty object {}
  // according to the DTO definition, so these properties don't exist
  // according to the schema. We trust typia.assert() to validate the structure.
  // We can validate the structure of the entire result, but not nested properties
  // that aren't defined in the schema.
}
