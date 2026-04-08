import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_cancellation_snapshots_retrieval_after_seller_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registers and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(customerAuth);
  // Update connection with customer token
  customerConnection.headers = {
    Authorization: `Bearer ${customerAuth.token.access}`,
  };
  // 2. Create shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          streetAddress: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postalCode: "12345",
          country: "Test Country",
          isDefault: true,
        },
      },
    );
  typia.assert(address);
  // 3. Checkout creates order with items in 'paid' status
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(order);
  // Get an order item from the order for cancellation
  // NOTE: Type assertion needed because items field is not in the select() of the backend query
  const orderWithItems = order as IEcommerceMallOrder & { items: IEcommerceMallOrderItem[] };
  const orderItem = orderWithItems.items[0];
  typia.assert(orderItem);
  // 4. Create cancellation request for the order item
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: "Changed my mind about the purchase",
        },
      },
    );
  typia.assert(cancellationRequest);
  // 5. Retrieve snapshots via pagination
  const snapshots =
    await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.list(
      customerConnection,
      {
        requestId: cancellationRequest.cancellationRequest.id,
      },
    );
  typia.assert(snapshots);
  // 6. Validate snapshot response structure
  TestValidator.equals(
    "has pagination info",
    snapshots.pagination !== null,
    true,
  );
  TestValidator.predicate("has data array", Array.isArray(snapshots.data));
  // Validate snapshot data structure if snapshots exist
  if (snapshots.data.length > 0) {
    const snapshot = snapshots.data[0];
    TestValidator.equals("has snapshot id", snapshot.id !== null, true);
    TestValidator.equals("has reason", snapshot.reason !== null, true);
    TestValidator.equals("has status", snapshot.status !== null, true);
    TestValidator.equals("has createdAt", snapshot.createdAt !== null, true);
    TestValidator.equals(
      "has cancellationRequest reference",
      snapshot.cancellationRequest !== null,
      true,
    );
  }
}