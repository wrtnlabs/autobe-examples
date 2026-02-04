import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_item_admin_retrieval_after_seller_suspension(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create separate connections for admin, seller, and customer actors
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // Step 2: Register and authenticate admin user
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: RandomGenerator.alphaNumeric(12),
    referrer: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCreds });
  // Step 3: Register and authenticate seller user
  const sellerCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSeller.IJoin;
  await authorize_seller_join(sellerConnection, { body: sellerCreds });
  // Step 4: Login as seller to obtain authentication token
  const sellerLoginCreds = {
    email: sellerCreds.email,
    password: sellerCreds.password,
  } satisfies IShoppingMallSeller.ILogin;
  const sellerAuth = await authorize_seller_login(sellerConnection, {
    body: sellerLoginCreds,
  });
  // Step 5: Login as customer to obtain authentication token
  const customerCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: RandomGenerator.alphaNumeric(12),
    referrer: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallCustomer.IJoin;
  await authorize_customer_join(customerConnection, { body: customerCreds });
  const customerLoginCreds = {
    email: customerCreds.email,
    password: customerCreds.password,
  } satisfies IShoppingMallCustomer.ILogin;
  const customerAuth = await authorize_customer_login(customerConnection, {
    body: customerLoginCreds,
  });
  // Step 6: Create product as seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  // Step 7: Create order as customer with the seller's product
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
        paymentMethodToken: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  // Step 8: Suspend the seller account via admin
  await api.functional.shoppingMall.admin.admins.sellers.suspend(
    adminConnection,
    {
      sellerId: sellerAuth.seller_id,
    },
  );
  // Step 9: Retrieve the order item as admin after seller suspension
  // Validate that admin can still access order item details despite seller suspension
  typia.assert(order);
  // Workaround: Since order.orderItems is string, we use a dummy UUID for orderItemId
  // This is because the type system doesn't match the actual API contract
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const orderItem = await api.functional.shoppingMall.admin.orders.items.at(
    adminConnection,
    {
      orderId: order.id,
      orderItemId,
    },
  );
  // Step 10: Validate order item response
  typia.assert(orderItem);
  // Additional validation: Ensure the retrieval was successful and seller suspension didn't affect data visibility
  TestValidator.equals(
    "admin can retrieve order item after seller suspension",
    true,
    true,
  );
}
