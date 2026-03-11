import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";

export async function test_api_customer_address_retrieval_with_order_history(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Register a new customer
  const registered = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(registered);
  // Create new connection with obtained token
  const customerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: registered.token.access },
  };
  // 2. Create a shipping address
  const address = await api.functional.ecommerceMall.customer.addresses.create(
    customerAuthConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 2 }),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphaNumeric(6),
        country: "Korea",
        is_default: true,
      } satisfies IEcommerceMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 3. Set the address as default (explicitly)
  const defaulted =
    await api.functional.ecommerceMall.customer.addresses._default.setDefault(
      customerAuthConnection,
      {
        addressId: address.id,
        body: {} satisfies IEcommerceMallAddress.IRequest,
      },
    );
  typia.assert(defaulted);
  // 4. Create a product and place an order using the address
  // First, create a seller to sell products
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.ecommerceMall.auth.customer.join(
    sellerConnection,
    {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(seller);
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: seller.token.access },
  };
  // Since there's no explicit product creation endpoint in the provided SDK,
  // we'll assume product creation happens through seller endpoints and focus on the order creation
  // Order creation will implicitly use the customer's default address
  // Try to create an order (this should use the customer's default address)
  const order = await api.functional.ecommerceMall.customer.orders.create(
    customerAuthConnection,
  );
  typia.assert(order);
  // 5. Verify the address is still accessible despite being linked to order
  const retrieved = await api.functional.ecommerceMall.customer.addresses.at(
    customerAuthConnection,
    {
      addressId: address.id,
    },
  );
  typia.assert(retrieved);
  // 6. Verify all address details are returned correctly
  TestValidator.equals("address ID matches", retrieved.id, address.id);
  TestValidator.equals(
    "recipient name matches",
    retrieved.recipient_name,
    address.recipient_name,
  );
  TestValidator.equals(
    "phone number matches",
    retrieved.phone_number,
    address.phone_number,
  );
  TestValidator.equals(
    "street address matches",
    retrieved.street_address,
    address.street_address,
  );
  TestValidator.equals("city matches", retrieved.city, address.city);
  TestValidator.equals(
    "state province matches",
    retrieved.state_province,
    address.state_province,
  );
  TestValidator.equals(
    "postal code matches",
    retrieved.postal_code,
    address.postal_code,
  );
  TestValidator.equals("country matches", retrieved.country, address.country);
  TestValidator.equals("is_default matches", retrieved.is_default, true);
  // 7. Verify timestamp fields remain consistent after order placement
  const created_at = retrieved.created_at;
  TestValidator.equals("created_at is date-time format", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(created_at), true);
  const updated_at = retrieved.updated_at;
  TestValidator.equals("updated_at is date-time format", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(updated_at), true);
  // 8. Verify the address is still accessible after being used in an order
  // (Business rule: addresses associated with orders cannot be deleted)
  const orderAddress = order.shippingAddress;
  TestValidator.equals("order uses same address", orderAddress.id, address.id);
  TestValidator.equals(
    "order recipient name matches",
    orderAddress.recipient_name,
    address.recipient_name,
  );
}