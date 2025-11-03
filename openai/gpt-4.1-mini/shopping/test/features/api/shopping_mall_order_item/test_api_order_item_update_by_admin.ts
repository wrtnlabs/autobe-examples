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

export async function test_api_order_item_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        ip: null,
        href: "http://localhost/admin/login",
        referrer: "http://localhost/",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // Step 2: Seller user registration and authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "SellerPass123!",
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: "SellerPass123!",
        ip: null,
        href: "http://localhost/seller/login",
        referrer: "http://localhost/",
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(sellerLogin);

  // Step 3: Seller creates a product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        brand: "BrandX",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  if (
    !product.shopping_mall_product_skus ||
    product.shopping_mall_product_skus.length === 0
  ) {
    throw new Error(
      "Product must have at least one SKU for order item reference",
    );
  }
  const sku = product.shopping_mall_product_skus[0];

  // Step 4: Admin creates an order item
  const orderCode = `ORDER-${RandomGenerator.alphaNumeric(8)}`;

  const createOrderItemBody = {
    shopping_mall_product_sku_id: sku.id,
    quantity: 1,
    unit_price: sku.price,
    total_price: sku.price,
  } satisfies IShoppingMallOrderItem.ICreate;

  const orderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.create(connection, {
      orderCode: orderCode,
      body: createOrderItemBody,
    });
  typia.assert(orderItem);

  // Step 5: Admin updates the order item
  const updatedQuantity = 5;
  const updatedUnitPrice = sku.price + 1500;

  const updateOrderItemBody = {
    quantity: updatedQuantity,
    unit_price: updatedUnitPrice,
    total_price: updatedQuantity * updatedUnitPrice,
  } satisfies IShoppingMallOrderItem.IUpdate;

  const updatedOrderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.updateItem(
      connection,
      {
        orderCode: orderCode,
        itemId: orderItem.id,
        body: updateOrderItemBody,
      },
    );

  typia.assert(updatedOrderItem);

  // Step 6: Assertions
  TestValidator.equals(
    "Updated order item quantity is correct",
    updatedOrderItem.quantity,
    updatedQuantity,
  );
  TestValidator.equals(
    "Updated order item unit price is correct",
    updatedOrderItem.unit_price,
    updatedUnitPrice,
  );
  TestValidator.equals(
    "Updated order item total price is correct",
    updatedOrderItem.total_price,
    updatedQuantity * updatedUnitPrice,
  );
}
