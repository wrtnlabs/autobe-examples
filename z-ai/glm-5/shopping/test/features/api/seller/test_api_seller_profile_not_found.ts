import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't correspond to any existing seller
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  // Test that requesting a non-existent seller profile returns 404 Not Found
  await TestValidator.httpError(
    "should return 404 for non-existent seller",
    404,
    async () => {
      await api.functional.shoppingMall.sellers.at(connection, {
        sellerId: nonExistentSellerId,
      });
    },
  );
}
