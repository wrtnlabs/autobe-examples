import api from "@ORGANIZATION/PROJECT-api";
import type { IApiError } from "@ORGANIZATION/PROJECT-api/lib/structures/IApiError";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_admin_cannot_modify_product_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create fresh connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Create product (auto-creates snapshot)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: typia.random<IShoppingMallProduct.ICreate>(),
    },
  );
  typia.assert(product);
  // 3. Admin setup - create fresh connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: typia.random<IShoppingMallAdmin.ILogin>(),
  });
  // 4. Attempt to modify product snapshot - endpoint returns 405 Method Not Allowed
  // Cast product to type with ID field to access productId
  const productId = (
    product as unknown as {
      id: string;
    }
  ).id;
  await TestValidator.httpError(
    "admin cannot modify product snapshot - method not allowed",
    405,
    async () => {
      await api.functional.shoppingMall.products.snapshots.update(
        adminConnection,
        {
          productId: productId,
        },
      );
    },
  );
}
