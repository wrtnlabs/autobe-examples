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

/**
 * Test retrieving detailed information of an order item by an admin.
 *
 * This test covers the following sequence:
 *
 * 1. Admin authenticates (join and login).
 * 2. Create a customer.
 * 3. Create a seller.
 * 4. Create a category (shopping mall category).
 * 5. Create a product assigned to seller and category.
 * 6. Add a SKU variant to the product.
 * 7. Create an order for the customer with the seller.
 * 8. Create an order item linked to the order and SKU.
 * 9. As the admin, retrieve the order item detail by order ID and order item ID.
 *
 * Validates that the data retrieved matches the created order item and covers
 * proper authorization.
 */
export async function test_api_order_item_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongPass!123";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 1.5 Admin login (to refresh token and ensure auth context)
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        type: "admin",
        remember_me: false,
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 2. Create a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPass!123";
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: {
        email: customerEmail,
        password_hash: customerPassword,
        nickname: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. Create a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPasswordHash = "SellerPass!123";
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: sellerEmail,
        password_hash: sellerPasswordHash,
        company_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 4. Create a shopping mall category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: {
          code:
            RandomGenerator.alphaNumeric(3).toUpperCase() +
            RandomGenerator.alphaNumeric(3).toUpperCase(),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Create a product
  const productCode =
    RandomGenerator.alphaNumeric(4).toUpperCase() +
    RandomGenerator.alphaNumeric(2).toUpperCase();
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_category_id: category.id,
        shopping_mall_seller_id: seller.id,
        code: productCode,
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 6 }),
        status: "Active",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 6. Create a SKU variant
  const skuCode =
    RandomGenerator.alphaNumeric(2).toUpperCase() +
    RandomGenerator.alphaNumeric(2).toUpperCase();
  const price = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<10000>
  >() satisfies number as number;
  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        shopping_mall_product_id: product.id,
        sku_code: skuCode,
        price: price,
        weight: (100 +
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<100>
          >()) satisfies number as number,
        status: "Active",
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku);

  // 7. Create an order
  const orderNumber =
    "ORD" +
    new Date().toISOString().replace(/[^\d]/g, "") +
    RandomGenerator.alphaNumeric(3).toUpperCase();
  const orderTotalPrice = price * 2;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: seller.id,
        order_number: orderNumber,
        total_price: orderTotalPrice,
        status: "Paid",
        business_status: "Processing",
        payment_method: "credit_card",
        shipping_address: `${RandomGenerator.paragraph({ sentences: 1 })} 123, City, Country`,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 8. Create an order item linked to the order and SKU
  const quantity = 2;
  const orderItemTotal = quantity * price;
  const orderItem =
    await api.functional.shoppingMall.customer.orders.items.create(connection, {
      orderId: order.id,
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_sku_id: sku.id,
        quantity: quantity satisfies number as number,
        unit_price: price,
        total_price: orderItemTotal,
      } satisfies IShoppingMallOrderItem.ICreate,
    });
  typia.assert(orderItem);

  // 9. As admin, retrieve the order item info
  const retrievedOrderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.at(connection, {
      orderId: order.id,
      orderItemId: orderItem.id,
    });
  typia.assert(retrievedOrderItem);

  // Validate the retrieved order item matches the created order item
  TestValidator.equals("order item id", retrievedOrderItem.id, orderItem.id);
  TestValidator.equals(
    "order id",
    retrievedOrderItem.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "sku id",
    retrievedOrderItem.shopping_mall_sku_id,
    sku.id,
  );
  TestValidator.equals("quantity", retrievedOrderItem.quantity, quantity);
  TestValidator.equals("unit price", retrievedOrderItem.unit_price, price);
  TestValidator.equals(
    "total price",
    retrievedOrderItem.total_price,
    orderItemTotal,
  );
}
