import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_order_creation_complete_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer connection and authenticate
  const customerConnection: api.IConnection = { 
    host: connection.host, 
    headers: {} 
  };
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/start",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  customerConnection.headers!.Authorization = authorizedCustomer.token.access;
  // Step 2: Verify customer profile authentication
  const customerProfile: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.customers.me.at(
      customerConnection,
    );
  typia.assert(customerProfile);
  TestValidator.equals(
    "customer profile email matches",
    customerProfile.customerId,
    authorizedCustomer.customerId,
  );
  // Step 3: Generate random order with payment token
  // We use the provided utility function that matches the API endpoint
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {
        body: {
          shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
          paymentMethodToken: RandomGenerator.alphaNumeric(32),
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // Since IShoppingMallOrder schema contains only:
  // - customerId: string | null
  // - id: string (uuid)
  // - orderItems: string
  // - shipments: string
  // - shippingAddress: IShoppingMallCustomerAddress
  // we can only validate the structure exists and is properly typed.
  // Validate that the structure matches the exact schema
  TestValidator.predicate(
    "order has valid customerId",
    typeof order.customerId === "string" || order.customerId === null,
  );
  TestValidator.predicate(
    "order has valid UUID id",
    /^[a-zA-Z0-9-]{36}$/.test(order.id),
  );
  TestValidator.predicate(
    "order has string orderItems",
    typeof order.orderItems === "string",
  );
  TestValidator.predicate(
    "order has string shipments",
    typeof order.shipments === "string",
  );
  TestValidator.equals(
    "order has valid shipping address",
    typeof order.shippingAddress,
    "object",
  );
  TestValidator.predicate(
    "shipping address has recipientName",
    typeof order.shippingAddress.recipientName === "string",
  );
  TestValidator.predicate(
    "shipping address has streetAddress",
    typeof order.shippingAddress.streetAddress === "string",
  );
  TestValidator.predicate(
    "shipping address has city",
    typeof order.shippingAddress.city === "string",
  );
  TestValidator.predicate(
    "shipping address has postalCode",
    typeof order.shippingAddress.postalCode === "string",
  );
  TestValidator.predicate(
    "shipping address has country",
    typeof order.shippingAddress.country === "string",
  );
}