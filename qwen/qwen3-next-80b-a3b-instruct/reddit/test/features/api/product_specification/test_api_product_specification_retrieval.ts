import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecification";
export async function test_api_product_specification_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate random product code and specification key
  const productCode = typia.random<string>();
  const specificationKey = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<255>
  >();
  // Call the API endpoint to retrieve the specification
  const retrievedSpecification =
    await api.functional.communityPlatform.products.specifications.at(
      connection,
      {
        productCode: productCode,
        specificationKey: specificationKey,
      },
    );
  // Validate the response type using typia.assert
  typia.assert(retrievedSpecification);
  // Verify the retrieved specification matches the requested keys (as per API contract)
  TestValidator.equals(
    "product code matches",
    retrievedSpecification.productCode,
    productCode,
  );
  TestValidator.equals(
    "specification key matches",
    retrievedSpecification.key,
    specificationKey,
  );
}
