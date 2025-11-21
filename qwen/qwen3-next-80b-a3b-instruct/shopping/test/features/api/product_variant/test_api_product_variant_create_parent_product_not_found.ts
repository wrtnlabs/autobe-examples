import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_product_variant_create_parent_product_not_found(
  connection: api.IConnection,
) {
  // Authenticate seller
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: typia.random<IShoppingMallSeller.ICreate>(),
    });
  typia.assert(seller);

  // Attempt to create a variant with a non-existent parent product ID using valid string-based body as per IShoppingMallProductVariant.ICreate definition
  await TestValidator.error(
    "creating variant with non-existent parent product should return 404",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productId: "00000000-0000-0000-0000-000000000000", // Valid UUID format, non-existent product
          body: "{}", // String representation of variant data as required by IShoppingMallProductVariant.ICreate
        },
      );
    },
  );
}
