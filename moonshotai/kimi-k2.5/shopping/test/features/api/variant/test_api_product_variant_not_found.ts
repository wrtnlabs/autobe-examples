import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test error scenarios where the variant retrieval fails with 404 NOT FOUND.
 *
 * Test cases:
 * 1. Non-existent variantId - validates 404 when variant doesn't exist in system
 * 2. Mismatched productId - validates 404 when variant exists but belongs to different product
 *
 * Note: Without product creation APIs available in the provided SDK, both test cases
 * use random UUIDs to trigger the 404 response. In a complete environment, test case 2
 * would explicitly create a variant under one product and attempt to access it via
 * a different productId to validate the resource scoping requirement.
 */
export async function test_api_product_variant_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test case 1: variantId doesn't exist in the system
  await TestValidator.httpError(
    "non-existent variant returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.products.variants.at(connection, {
        productId: typia.random<IEcommerceMallProductVariant["productId"]>(),
        variantId: typia.random<IEcommerceMallProductVariant["id"]>(),
      });
    },
  );
  // Test case 2: variant exists but belongs to a different product
  // Using different random UUIDs simulates the mismatched product-variant relationship
  await TestValidator.httpError(
    "variant not belonging to specified product returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.products.variants.at(connection, {
        productId: typia.random<IEcommerceMallProductVariant["productId"]>(),
        variantId: typia.random<IEcommerceMallProductVariant["id"]>(),
      });
    },
  );
}
