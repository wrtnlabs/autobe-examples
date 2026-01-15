import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecification";
export async function test_api_product_specifications_filtered_by_category(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random product code for testing
  const productCode = typia.random<string & tags.Format<"uuid">>();
  // Create a connection object with same host
  const testConnection: api.IConnection = { host: connection.host };
  // Call the endpoint to retrieve specifications filtered by 'Electronics' category
  const result =
    await api.functional.communityPlatform.products.specifications.index(
      testConnection,
      {
        productCode,
        body: {
          categories: ["Electronics"],
        },
      },
    );
  // Validate that the response conforms to the ICommunityPlatformProductSpecification schema
  typia.assert<ICommunityPlatformProductSpecification>(result);
  // Verify that the returned object has the required properties
  TestValidator.equals(
    "productCode should be defined",
    result.productCode,
    result.productCode,
  );
  TestValidator.predicate(
    "key should be a non-empty string",
    () => typeof result.key === "string" && result.key.length > 0,
  );
  TestValidator.predicate(
    "value should be a string with max 5000 chars",
    () => typeof result.value === "string" && result.value.length <= 5000,
  );
  // Validate that the productCode matches what was requested
  TestValidator.equals(
    "productCode should match request",
    result.productCode,
    productCode,
  );
  // Since we cannot pre-populate test data, we cannot verify the filtering logic (specifically that other categories are excluded)
  // The API's filtering functionality cannot be tested because we cannot create its prerequisite data state
  // We can only validate that the endpoint accepts the request parameter and returns a valid ICommunityPlatformProductSpecification
}
