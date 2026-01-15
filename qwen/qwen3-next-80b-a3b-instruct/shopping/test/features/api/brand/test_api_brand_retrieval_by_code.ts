import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBrand";
export async function test_api_brand_retrieval_by_code(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random brand code with valid format
  const brandCode = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<100>
  >();
  // Call the API to retrieve the brand by code
  const brand: IShoppingMallProductBrand =
    await api.functional.shoppingMall.brands.at(connection, {
      brandCode,
    });
  // Validate that the response matches the expected schema
  typia.assert(brand);
  // Verify that the returned brand code matches the requested code
  TestValidator.equals("brand code matches requested", brand.code, brandCode);
  // Test error scenario: non-existent brand code
  await TestValidator.error(
    "non-existent brand code should return error",
    async () => {
      const nonExistentCode =
        "non-existent-brand-code-" + typia.random<number>().toString();
      await api.functional.shoppingMall.brands.at(connection, {
        brandCode: nonExistentCode,
      });
    },
  );
}
