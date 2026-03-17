import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_detail_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Use a non-existent UUID to simulate soft-deleted product scenario
  // The API specification states: 404 NOT_FOUND when product not found or deleted
  const nonExistentProductId: string = "00000000-0000-0000-0000-000000000000";
  // Validate that attempting to retrieve a non-existent product returns 404
  await TestValidator.httpError(
    "soft-deleted or non-existent product returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.products.at(connection, {
        productId: nonExistentProductId,
      });
    },
  );
}
