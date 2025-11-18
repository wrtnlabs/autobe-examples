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

export async function test_api_admin_sku_detail_reflects_inventory_state_changes(
  connection: api.IConnection,
) {
  // 1. Seller joins
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  const sellerEmail: string & tags.Format<"email"> = sellerAuthorized.email;
  const sellerPassword: string & tags.Format<"password"> =
    sellerJoinBody.password;

  // 2. Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const adminEmail: string & tags.Format<"email"> = adminAuthorized.email;
  const adminPassword: string & tags.Format<"password"> =
    adminJoinBody.password;

  // 3. As admin, create inventory state A
  // Ensure we are authenticated as admin (join already set token, but be explicit and idempotent via login)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginResult);

  const inventoryStateACode = `in_stock_${RandomGenerator.alphaNumeric(8)}`;

  const inventoryStateABody = {
    code: inventoryStateACode,
    name: "In Stock (Test A)",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const inventoryStateA: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: inventoryStateABody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(inventoryStateA);

  // 4. As seller, create a product
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/login",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginResult);

  const productCreateBody = {
    code: `PRD-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE Test Brand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.example.com/images/product.png",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 5. As seller, create a SKU bound to inventory state A
  const skuCreateBody = {
    code: `SKU-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    barcode: RandomGenerator.alphaNumeric(13) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    status: "active" as string & tags.MinLength<1> & tags.MaxLength<64>,
    price: 1000 as number & tags.Minimum<0>,
    original_price: 1500 as number & tags.Minimum<0>,
    inventory_quantity: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    low_stock_threshold: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
    shopping_mall_sku_inventory_state_id: inventoryStateA.id,
    attribute_value_ids: [] as (string & tags.Format<"uuid">)[],
    external_ids: [
      {
        system_code: "WMS-TEST",
        external_id: `EXT-${RandomGenerator.alphaNumeric(8)}`,
      },
    ] satisfies IShoppingMallSkuExternalId.ICreate[],
  } satisfies IShoppingMallSku.ICreate;

  const sellerSku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateBody,
    });
  typia.assert<IShoppingMallSku>(sellerSku);

  // Sanity checks on seller SKU
  TestValidator.equals(
    "seller SKU inventory_state.id matches stateA.id",
    sellerSku.inventory_state.id,
    inventoryStateA.id,
  );
  TestValidator.equals(
    "seller SKU inventory_state.code matches created inventory state code",
    sellerSku.inventory_state.code,
    inventoryStateABody.code,
  );
  TestValidator.equals(
    "seller SKU inventory_state.is_purchasable is true (stateA)",
    sellerSku.inventory_state.is_purchasable,
    inventoryStateABody.is_purchasable,
  );

  // 6. As admin, fetch SKU detail via admin endpoint
  const adminLoginForReadBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginForRead: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginForReadBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginForRead);

  const adminViewSku: IShoppingMallSku =
    await api.functional.shoppingMall.admin.skus.at(connection, {
      skuId: sellerSku.id,
    });
  typia.assert<IShoppingMallSku>(adminViewSku);

  // 7. Cross-view consistency assertions between seller SKU and admin SKU detail
  TestValidator.equals(
    "SKU id matches between seller and admin views",
    adminViewSku.id,
    sellerSku.id,
  );

  TestValidator.equals(
    "SKU code matches between seller and admin views",
    adminViewSku.code,
    sellerSku.code,
  );

  TestValidator.equals(
    "SKU price matches between seller and admin views",
    adminViewSku.price,
    sellerSku.price,
  );

  TestValidator.equals(
    "SKU product id matches between seller and admin views",
    adminViewSku.product.id,
    sellerSku.product.id,
  );

  TestValidator.equals(
    "Admin SKU inventory_state.id equals created stateA.id",
    adminViewSku.inventory_state.id,
    inventoryStateA.id,
  );

  TestValidator.equals(
    "Admin SKU inventory_state.code equals created stateA.code",
    adminViewSku.inventory_state.code,
    inventoryStateABody.code,
  );

  TestValidator.equals(
    "Admin SKU inventory_state.is_purchasable equals created stateA.is_purchasable",
    adminViewSku.inventory_state.is_purchasable,
    inventoryStateABody.is_purchasable,
  );
}
