import api from "@ORGANIZATION/PROJECT-api";
import type { IApiError } from "@ORGANIZATION/PROJECT-api/lib/structures/IApiError";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_super_admin_cannot_modify_product_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinInput = {
    name: "Test Seller",
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    shopName: RandomGenerator.name(3),
    shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    { body: sellerJoinInput },
  );
  typia.assert(sellerAuth);
  // Update seller connection headers for subsequent calls
  sellerConnection.headers = sellerConnection.headers || {};
  sellerConnection.headers.Authorization = sellerAuth.token.access;
  // Step 2: Create product (auto-generates snapshot)
  const productInput = {
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
    variants: ArrayUtil.repeat(1, () => ({
      name: RandomGenerator.name(2),
      sku: RandomGenerator.alphaNumeric(8),
      stock: 10,
      price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
    })),
    images: ArrayUtil.repeat(1, () => ({
      url: "https://example.com/image.jpg",
      alt: RandomGenerator.name(2),
      sort: 0,
    })),
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    { body: productInput },
  );
  typia.assert(product);
  // Step 3: Auth as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
  } satisfies IShoppingMallSuperAdmin.IJoin;
  const superAdminAuth =
    await api.functional.shoppingMall.auth.super_admin.join(
      superAdminConnection,
      { body: superAdminJoinInput },
    );
  typia.assert(superAdminAuth);
  // Update super admin connection headers for subsequent calls
  superAdminConnection.headers = superAdminConnection.headers || {};
  superAdminConnection.headers.Authorization = superAdminAuth.token.access;
  // Step 4: Attempt to PATCH the product snapshot (should fail with 405)
  await TestValidator.error(
    "super admin cannot modify product snapshot",
    async () => {
      const result =
        await api.functional.shoppingMall.products.snapshots.update(
          superAdminConnection,
          {
            productId: (product as unknown as IEntity).id,
          },
        );
      typia.assert(result);
      return result;
    },
  );
}