import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_product_creation_title_too_short(
  connection: api.IConnection,
) {
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: typia.random<IShoppingMallSeller.ICreate>(),
    });
  typia.assert(seller);

  await TestValidator.error(
    "product creation should fail for title less than 3 characters",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: "aa", // Invalid: 2-character string
      });
    },
  );
}
