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
import type { IShoppingMallOrderStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the retrieval of an order status by an admin user.
 *
 * This test covers a full setup flow:
 *
 * 1. Register and authenticate an admin user.
 * 2. Register and authenticate a customer user.
 * 3. Admin creates a product category.
 * 4. Admin creates a seller account.
 * 5. Admin creates a product linked to the category and seller.
 * 6. Customer places an order with the created product.
 * 7. Customer adds an order item for the order.
 * 8. Customer creates an order status record.
 * 9. Switch to admin authentication.
 * 10. Admin retrieves the specific order status by orderId and statusId.
 * 11. Validate the correctness of the retrieved order status.
 * 12. Test unauthorized access by attempting retrieval from customer connection.
 * 13. Test retrieval of a non-existent order status ID by admin.
 *
 * All steps use correct request and response DTO types with typia.assert
 * validations. Authentication is handled by actual join and login APIs for role
 * switching. TestValidator functions carry descriptive titles for clarity.
 */
export async function test_api_order_status_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    password_hash: "hashed_password_admin",
    full_name: "Admin User",
    phone_number: "01012345678",
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Admin user login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "plain_password_admin",
      type: "admin",
      remember_me: true,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 3. Customer user registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "customer_password",
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 4. Customer user login
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "customer_password",
      __typename: "ILogin",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 5. Admin creates a product category
  const categoryName = RandomGenerator.name(2);
  const categoryCode = RandomGenerator.alphaNumeric(8);
  const categoryCreateBody = {
    parent_id: null,
    code: categoryCode,
    name: categoryName,
    description: "Test product category",
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.shoppingMall.categories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 6. Admin creates a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerCreateBody = {
    email: sellerEmail,
    password_hash: "hashed_password_seller",
    company_name: "Test Seller Company",
    contact_name: "Mr. Seller",
    phone_number: "01098765432",
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 7. Admin creates a product linked to category and seller
  const productCode = RandomGenerator.alphaNumeric(10);
  const productName = RandomGenerator.name(3);
  const productCreateBody = {
    shopping_mall_category_id: category.id,
    shopping_mall_seller_id: seller.id,
    code: productCode,
    name: productName,
    description: "Test product description",
    status: "active",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 8. Switch to customer login context to place order
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "customer_password",
      __typename: "ILogin",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 9. Customer places an order
  const orderNumber = `ORD-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const orderCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: seller.id,
    order_number: orderNumber,
    total_price: 12345.67,
    status: "pending",
    business_status: "new",
    payment_method: "credit_card",
    shipping_address: "123 Test Address, Test City, TC",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 10. Customer adds an order item for the order
  const orderItemCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_sku_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 2,
    unit_price: 6172.835,
    total_price: 12345.67,
  } satisfies IShoppingMallOrderItem.ICreate;
  const orderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.customer.orders.items.create(connection, {
      orderId: order.id,
      body: orderItemCreateBody,
    });
  typia.assert(orderItem);

  // 11. Customer creates an order status record
  const statusCreateBody = {
    shopping_mall_order_id: order.id,
    status: "pending",
    status_changed_at: new Date().toISOString(),
  } satisfies IShoppingMallOrderStatus.ICreate;
  const orderStatus: IShoppingMallOrderStatus =
    await api.functional.shoppingMall.customer.orders.statuses.create(
      connection,
      {
        orderId: order.id,
        body: statusCreateBody,
      },
    );
  typia.assert(orderStatus);

  // 12. Switch to admin login context for retrieval
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "plain_password_admin",
      type: "admin",
      remember_me: true,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 13. Admin retrieves the specific order status by orderId and statusId
  const retrievedStatus: IShoppingMallOrderStatus =
    await api.functional.shoppingMall.admin.orders.statuses.at(connection, {
      orderId: orderStatus.shopping_mall_order_id,
      statusId: orderStatus.id,
    });
  typia.assert(retrievedStatus);
  TestValidator.equals(
    "Retrieved order status ID matches",
    retrievedStatus.id,
    orderStatus.id,
  );
  TestValidator.equals(
    "Retrieved order status order ID matches",
    retrievedStatus.shopping_mall_order_id,
    orderStatus.shopping_mall_order_id,
  );
  TestValidator.equals(
    "Retrieved order status value matches",
    retrievedStatus.status,
    orderStatus.status,
  );
  TestValidator.equals(
    "Retrieved status change time matches",
    retrievedStatus.status_changed_at,
    orderStatus.status_changed_at,
  );

  // 14. Test unauthorized retrieval attempt: Customer tries to get order status
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "customer_password",
      __typename: "ILogin",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  await TestValidator.error(
    "Unauthorized customer cannot retrieve another user's order status",
    async () => {
      await api.functional.shoppingMall.admin.orders.statuses.at(connection, {
        orderId: orderStatus.shopping_mall_order_id,
        statusId: orderStatus.id,
      });
    },
  );

  // 15. Admin attempts to retrieve a non-existent order status
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "plain_password_admin",
      type: "admin",
      remember_me: true,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const nonExistentStatusId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Admin fails to retrieve non-existent order status",
    async () => {
      await api.functional.shoppingMall.admin.orders.statuses.at(connection, {
        orderId: orderStatus.shopping_mall_order_id,
        statusId: nonExistentStatusId,
      });
    },
  );
}
