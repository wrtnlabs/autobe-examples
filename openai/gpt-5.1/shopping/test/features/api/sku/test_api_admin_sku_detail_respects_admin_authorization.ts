import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_sku_detail_respects_admin_authorization(
  connection: api.IConnection,
) {
  // 1. Create a seller account via /auth/seller/join
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerEmail: string & tags.Format<"email"> = sellerAuthorized.email;
  const sellerPassword: string & tags.Format<"password"> =
    sellerJoinBody.password;

  // 2. As that seller, create a product via /shoppingMall/seller/products
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(10),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Create an admin via /auth/admin/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorizedOnJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedOnJoin);

  const adminEmail: string & tags.Format<"email"> = adminJoinBody.email;
  const adminPassword: string & tags.Format<"password"> =
    adminJoinBody.password;

  // 4. As admin, create an inventory state via /shoppingMall/admin/skuInventoryStates
  // (Ensure we are authenticated as admin by logging in explicitly)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAuthorizedOnLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedOnLogin);

  const skuInventoryStateCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(inventoryState);

  // 5. As the seller, create a SKU under the product via /shoppingMall/seller/products/{productId}/skus
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAuthorizedOnLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorizedOnLogin);

  const skuCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    barcode: RandomGenerator.alphaNumeric(13),
    status: "active",
    price: 1000,
    original_price: 1200,
    inventory_quantity: 10,
    low_stock_threshold: 2,
    shopping_mall_sku_inventory_state_id: inventoryState.id,
    attribute_value_ids: [],
    external_ids: [],
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert(sku);

  const skuId: string & tags.Format<"uuid"> = sku.id;

  // Prepare an unauthenticated connection by cloning the base connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 6.a Attempt to call GET /shoppingMall/admin/skus/{skuId} with no Authorization header
  await TestValidator.error(
    "unauthenticated admin sku detail must fail",
    async () => {
      await api.functional.shoppingMall.admin.skus.at(
        unauthenticatedConnection,
        {
          skuId,
        },
      );
    },
  );

  // 6.b Attempt to call GET /shoppingMall/admin/skus/{skuId} using the seller JWT
  await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });

  await TestValidator.error(
    "seller-authenticated admin sku detail must fail",
    async () => {
      await api.functional.shoppingMall.admin.skus.at(connection, {
        skuId,
      });
    },
  );

  // 6.c Call GET /shoppingMall/admin/skus/{skuId} using an admin JWT as control
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

  const adminSku: IShoppingMallSku =
    await api.functional.shoppingMall.admin.skus.at(connection, {
      skuId,
    });
  typia.assert(adminSku);

  TestValidator.equals(
    "admin-authenticated sku detail returns the created sku",
    adminSku.id,
    skuId,
  );
}
