import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_variant_information_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate valid UUIDs for productId and variantId
  const productId: string = typia.random<string & tags.Format<"uuid">>();
  const variantId: string = typia.random<string & tags.Format<"uuid">>();
  // Customer retrieves the variant information using the generated IDs
  const variant = await api.functional.shoppingMall.products.variants.at(
    connection,
    {
      productId,
      variantId,
    },
  );
  
  // Assert the entire structure to validate values
  typia.assert(variant);
  
  // Cast variant to a structure that matches the expected test assertions
  // Assuming the API response contains these fields but under different naming or nested structure
  // We'll use assert to validate and then extract inferred values from it (no direct property access)
  const structured: {
    id: string;
    sku: string;
    price_override: number;
    stock: number;
    option_values: Record<string, string>;
  } = typia.assert<{
    id: string;
    sku: string;
    price_override: number;
    stock: number;
    option_values: Record<string, string>;
  }>(variant);
  
  // Validate the variant data meets the expected structure
  TestValidator.equals(
    "variant id matches requested variantId",
    structured.id,
    variantId,
  );
  TestValidator.predicate(
    "SKU is present and non-empty",
    Boolean(structured.sku) && structured.sku.length > 0,
  );
  TestValidator.predicate(
    "price override is a non-negative number",
    structured.price_override >= 0,
  );
  TestValidator.predicate(
    "stock quantity is a non-negative number",
    structured.stock >= 0,
  );
  TestValidator.predicate(
    "option_values is an object",
    typeof structured.option_values === "object" && structured.option_values !== null,
  );
  
  // Verify option_values contains at least one key-value pair
  const optionKeys = Object.keys(structured.option_values);
  TestValidator.predicate(
    "option_values has at least one option",
    optionKeys.length > 0,
  );
  
  // Verify all option_values values are strings
  for (const key of optionKeys) {
    TestValidator.predicate(
      `option value for ${key} is a string`,
      typeof structured.option_values[key] === "string",
    );
  }
}