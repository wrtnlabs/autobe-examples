import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_order_item_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "admin_password_123",
    full_name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Admin login
  const adminLoginBody = {
    email: adminEmail,
    password: "admin_password_123",
    ip: null,
    href: "http://localhost/admin",
    referrer: "http://localhost/login",
  } satisfies IShoppingMallAdmin.ILogin;
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLogin);

  // 3. Seller join for product creation
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "seller_password_123",
    store_name: RandomGenerator.name(1),
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(seller);

  // 4. Seller login
  const sellerLoginBody = {
    email: sellerEmail,
    password: "seller_password_123",
    ip: null,
    href: "http://localhost/seller",
    referrer: "http://localhost/login",
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 5. Create product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    brand: RandomGenerator.name(1),
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 6. Create order item
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const orderCode = `ORDER-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const orderItemCreateBody = {
    shopping_mall_product_sku_id: skuId,
    quantity: 1,
    unit_price: 10000,
    total_price: 10000,
  } satisfies IShoppingMallOrderItem.ICreate;
  const orderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.create(connection, {
      orderCode: orderCode,
      body: orderItemCreateBody,
    });
  typia.assert(orderItem);

  // 7. Delete order item as admin
  await api.functional.shoppingMall.admin.orders.items.eraseItem(connection, {
    orderCode: orderCode,
    itemId: orderItem.id,
  });
}
