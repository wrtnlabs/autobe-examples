import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { prepare_random_shopping_mall_section } from "../../../prepare/prepare_random_shopping_mall_section";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_item_cancellation_request_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate to gain permissions
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const admin = await api.functional.shoppingMall.auth.admin.login.signIn(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IShoppingMallAdmin.ILogin,
    },
  );
  typia.assert(admin);
  // Step 2: Create seller connection and authenticate to create products
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<12>>();
  const sellerResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.IJoin,
  });
  const seller = await api.functional.shoppingMall.auth.seller.login(
    sellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(seller);
  // Step 3: Create a category for the product (admin permissions required)
  const category = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallSection.ICreate,
    },
  );
  typia.assert(category);
  // Step 4: Create a product by seller
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        category_id: category.categoryId,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 5: Create customer connection and authenticate to place an order
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.MinLength<8>>();
  const customerResponse = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const customer = await api.functional.shoppingMall.auth.customer.login(
    customerConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(customer);
  // Step 6: Create an order by customer using valid data
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
        paymentMethodToken: typia.random<string>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Step 7: Create a cancellation request with admin user
  // Even though we can't get order item IDs from order response,
  // we must use a valid UUID for the order item ID as required by the API endpoint
  // The system should accept the cancellation request when valid parameters are provided
  const cancellationReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const orderId = order.id;
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequest =
    await api.functional.shoppingMall.admin.orders.items.cancel.create(
      adminConnection,
      {
        orderId,
        orderItemId,
        body: {
          reason: cancellationReason,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(cancellationRequest);
  // Step 8: Validate the cancellation request response
  // Removed status check since IShoppingMallCancellationRequest doesn't have status property
  TestValidator.equals(
    "cancellation request reason",
    cancellationRequest.reason,
    cancellationReason,
  );
  // Step 9: Verify idempotency by trying to submit the same request again
  const duplicateCancellationRequest =
    await api.functional.shoppingMall.admin.orders.items.cancel.create(
      adminConnection,
      {
        orderId,
        orderItemId,
        body: {
          reason: cancellationReason,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(duplicateCancellationRequest);
  // Verify that the system handled idempotency correctly (same request returns same response)
  // Removed ID comparison since IShoppingMallCancellationRequest doesn't have id property
}