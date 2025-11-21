import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductTag";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_product_tag_association_invalid_product_id(
  connection: api.IConnection,
) {
  // Authenticate as seller to obtain valid session context
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: typia.random<IShoppingMallSeller.ICreate>(),
    });
  typia.assert(seller);

  // Attempt to patch tags for a non-existent product ID (invalid UUID)
  const invalidProductId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error(
    "should return 404 for non-existent product ID",
    async () => {
      await api.functional.shoppingMall.products.tags.index(connection, {
        productId: invalidProductId,
      });
    },
  );
}
