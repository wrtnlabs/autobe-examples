import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Use a non-existent UUID for productId
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  // Should throw 404 error when requesting non-existent product
  await TestValidator.error(
    "should return 404 for non-existent product",
    async () => {
      await api.functional.shoppingMall.products.at(connection, {
        productId: nonExistentId,
      });
    },
  );
}
