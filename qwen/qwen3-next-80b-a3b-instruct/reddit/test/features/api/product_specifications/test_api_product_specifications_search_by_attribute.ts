import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecification";

export async function test_api_product_specifications_search_by_attribute(
  connection: api.IConnection,
): Promise<void> {
  // Create a unique product code for this test
  const productCode = `product-${RandomGenerator.alphaNumeric(8)}`;
  // Create a product with multiple specifications to test search functionality
  // These specifications include various weight-related attributes and values
  const specifications = ArrayUtil.repeat(5, (i) => {
    return {
      productCode,
      key:
        i === 0
          ? "weight_kg"
          : i === 1
            ? "weight_grams"
            : i === 2
              ? "dimensions"
              : i === 3
                ? "weight_description"
                : "color",
      value:
        i === 0
          ? "2.5"
          : i === 1
            ? "2500"
            : i === 2
              ? "50x30x10 cm"
              : i === 3
                ? "Weight of the product is 2.5 kg"
                : "red",
    } satisfies ICommunityPlatformProductSpecification;
  });
  // Use the first three specifications to create the test data
  const createPromises = specifications.slice(0, 4).map((spec) => {
    return api.functional.communityPlatform.products.specifications.index(
      connection,
      {
        productCode,
        body: {
          // For this test, we need to send the specs as request body since they are creating
          // But we only need one update operation to test search functionality - create all
        },
      },
    );
  });
  // Create specifications using batch create approach
  for (const spec of specifications.slice(0, 4)) {
    // Get the specs to create using partial mix
    const specToCreate = { ...spec };
    await api.functional.communityPlatform.products.specifications.index(
      connection,
      {
        productCode: specToCreate.productCode,
        body: {},
      },
    );
  }
  // Send search request to find specs related to weight
  const searchResult =
    await api.functional.communityPlatform.products.specifications.index(
      connection,
      {
        productCode,
        body: {
          search: "weight", // Search for partial match on 'weight'
        },
      },
    );
  // Validate results have exactly the weight-related specifications (2.5kg, 2500g, weight_description)
  typia.assert(searchResult);
  // Convert searchResult to array if it's not already
  const results: ICommunityPlatformProductSpecification[] = Array.isArray(searchResult) ? searchResult : [searchResult];
  // Check that we found exactly 3 results containing 'weight' in key or value
  TestValidator.equals(
    "found 3 weight-related specifications",
    results.length,
    3,
  );
  // Validate each result contains 'weight' in key or value
  for (const spec of results) {
    TestValidator.predicate(
      "specification key or value contains 'weight'",
      spec.key.toLowerCase().includes("weight") ||
        spec.value.toLowerCase().includes("weight"),
    );
  }
  // Verify sorting is by productCode then key (default behavior)
  // The specs should be sorted by productCode (all same) then by key
  // Key order: "weight_kg", "weight_grams", "weight_description" (alphabetical)
  TestValidator.equals(
    "first result has weight_kg",
    results[0].key,
    "weight_kg",
  );
  TestValidator.equals(
    "second result has weight_grams",
    results[1].key,
    "weight_grams",
  );
  TestValidator.equals(
    "third result has weight_description",
    results[2].key,
    "weight_description",
  );
  // Verify the values are correctly retrieved
  TestValidator.equals("weight_kg value is 2.5", results[0].value, "2.5");
  TestValidator.equals(
    "weight_grams value is 2500",
    results[1].value,
    "2500",
  );
  TestValidator.equals(
    "weight_description value is correct",
    results[2].value,
    "Weight of the product is 2.5 kg",
  );
}