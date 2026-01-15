import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecification";
export async function test_api_product_specifications_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a realistic product code string (business identifier)
  const productCode = RandomGenerator.name();
  // Create a request body to retrieve all specifications without filters
  const requestBody = {
    includeAll: true,
  } satisfies ICommunityPlatformProductSpecification.IRequest;
  // Call the API to retrieve product specifications
  const specification: ICommunityPlatformProductSpecification =
    await api.functional.communityPlatform.products.specifications.index(
      connection,
      {
        productCode: productCode,
        body: requestBody,
      },
    );
  // Validate the response type using typia.assert() - this validates ALL properties and formats
  typia.assert(specification);
  // Confirm the specification matches the expected product code
  TestValidator.equals(
    "specification product code matches requested product code",
    specification.productCode,
    productCode,
  );
  // Confirm the key is not empty and within length limits (business logic validation)
  TestValidator.predicate(
    "specification key has valid length",
    specification.key.length >= 1 && specification.key.length <= 255,
  );
  // Confirm the value is within maximum length limit (business logic validation)
  TestValidator.predicate(
    "specification value is within length limit",
    specification.value.length <= 5000,
  );
}
