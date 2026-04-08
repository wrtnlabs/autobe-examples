import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_variant_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate random UUIDs that don't exist in the database
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentVariantId = typia.random<string & tags.Format<"uuid">>();
  // Test that retrieving a non-existent variant returns 404
  await TestValidator.httpError(
    "should return 404 for non-existent variant",
    404,
    async () => {
      await api.functional.ecommerceMall.products.variants.at(connection, {
        productId: nonExistentProductId,
        productVariantId: nonExistentVariantId,
      });
    },
  );
}
