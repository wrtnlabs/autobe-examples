import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export async function test_api_product_tag_removal_nonexistent_relationship(
  connection: api.IConnection,
) {
  const admin = await api.functional.auth.admin.join(connection, {
    body: typia.random<IShoppingMallAdmin.ICreate>(),
  });
  typia.assert(admin);
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: typia.random<IShoppingMallProduct.ICreate>() },
  );
  typia.assert(product);

  await TestValidator.error(
    "non-existent product should return 404",
    async () => {
      await api.functional.shoppingMall.admin.products.tags.erase(connection, {
        productId: typia.random<string & tags.Format<"uuid">>(),
        tagId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
