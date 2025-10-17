import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

export async function test_api_order_item_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer account join and authenticate
  const customerPassword = "test_password_123";
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: customerPassword,
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(customerAuth);

  // Customer login to ensure authenticated session
  const customerLoginInput = {
    email: customerJoinInput.email,
    password: customerPassword,
    __typename: "login",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLogin = await api.functional.auth.customer.login(connection, {
    body: customerLoginInput,
  });
  typia.assert(customerLogin);

  // 2. Admin account join and authenticate
  const adminPasswordHash = "hashed_password_example_123";
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: adminPasswordHash,
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // Admin login
  const adminLoginInput = {
    email: adminJoinInput.email,
    password: adminPasswordHash,
    type: "admin",
  } satisfies IShoppingMallAdmin.ILogin;
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: adminLoginInput,
  });
  typia.assert(adminLogin);

  // 3. Seller account join and authenticate
  const sellerPasswordHash = "hashed_seller_password_example_789";
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: sellerPasswordHash,
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinInput,
  });
  typia.assert(sellerAuth);

  // Seller login
  const sellerLoginInput = {
    email: sellerJoinInput.email,
    password: sellerPasswordHash,
    // optional fields omitted
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: sellerLoginInput,
  });
  typia.assert(sellerLogin);

  // 4. Admin creates a category
  const categoryCreateInput = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    display_order: 1,
  } satisfies IShoppingMallCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: categoryCreateInput,
      },
    );
  typia.assert(category);

  // 5. Admin creates a product linked to created category and seller
  const productCreateInput = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: sellerAuth.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    status: "active",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: productCreateInput,
    },
  );
  typia.assert(product);

  // 6. Seller creates a SKU for the product
  const skuCreateInput = {
    shopping_mall_product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(10),
    price: 10000,
    status: "active",
  } satisfies IShoppingMallSku.ICreate;
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuCreateInput,
    },
  );
  typia.assert(sku);

  // 7. Customer creates an order associated with the seller
  const orderCreateInput = {
    shopping_mall_customer_id: customerAuth.id,
    shopping_mall_seller_id: sellerAuth.id,
    order_number: `ON-${RandomGenerator.alphaNumeric(6)}`,
    total_price: 10000,
    status: "pending",
    business_status: "new",
    payment_method: "card",
    shipping_address: "123 Test St, Seoul",
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: orderCreateInput,
    },
  );
  typia.assert(order);

  // 8. Customer adds an order item to the order referencing the SKU
  const orderItemCreateInput = {
    shopping_mall_order_id: order.id,
    shopping_mall_sku_id: sku.id,
    quantity: 1,
    unit_price: skuCreateInput.price,
    total_price: skuCreateInput.price * 1,
  } satisfies IShoppingMallOrderItem.ICreate;
  const orderItem =
    await api.functional.shoppingMall.customer.orders.items.create(connection, {
      orderId: order.id,
      body: orderItemCreateInput,
    });
  typia.assert(orderItem);

  // 9. Customer updates the order item: modify quantity and prices
  const updatedQuantity = 3;
  const updatedUnitPrice = 9500;
  const updatedTotalPrice = updatedQuantity * updatedUnitPrice;
  const orderItemUpdateInput = {
    shopping_mall_order_id: order.id,
    shopping_mall_sku_id: sku.id,
    quantity: updatedQuantity,
    unit_price: updatedUnitPrice,
    total_price: updatedTotalPrice,
  } satisfies IShoppingMallOrderItem.IUpdate;

  const updatedOrderItem =
    await api.functional.shoppingMall.customer.orders.items.updateOrderItem(
      connection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
        body: orderItemUpdateInput,
      },
    );
  typia.assert(updatedOrderItem);

  // 10. Validation of update
  TestValidator.equals(
    "order item id remains the same",
    updatedOrderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "updated quantity",
    updatedOrderItem.quantity,
    updatedQuantity,
  );
  TestValidator.equals(
    "updated unit price",
    updatedOrderItem.unit_price,
    updatedUnitPrice,
  );
  TestValidator.equals(
    "updated total price",
    updatedOrderItem.total_price,
    updatedTotalPrice,
  );
}
