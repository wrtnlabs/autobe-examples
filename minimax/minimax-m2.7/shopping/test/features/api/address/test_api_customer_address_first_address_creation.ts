import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_customer_address_first_address_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  // 2. Prepare address creation payload with all required fields
  const addressBody = {
    recipientName: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    streetAddress: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.paragraph({ sentences: 1 })}`,
    city: RandomGenerator.name(),
    state: RandomGenerator.name(),
    postalCode: RandomGenerator.alphabets(5),
    country: "United States",
  } satisfies IEcommerceMallShippingAddress.ICreate;
  // 3. Create the first shipping address
  const address =
    await api.functional.ecommerceMall.customer.customers.addresses.create(
      customerConnection,
      {
        body: addressBody,
      },
    );
  typia.assert(address);
  // 4. Validate address creation response - all fields match input
  TestValidator.equals(
    "recipient name matches",
    address.recipient_name,
    addressBody.recipientName,
  );
  TestValidator.equals("phone matches", address.phone, addressBody.phone);
  TestValidator.equals(
    "street address matches",
    address.street_address,
    addressBody.streetAddress,
  );
  TestValidator.equals("city matches", address.city, addressBody.city);
  TestValidator.equals("state matches", address.state, addressBody.state);
  TestValidator.equals(
    "postal code matches",
    address.postal_code,
    addressBody.postalCode,
  );
  TestValidator.equals("country matches", address.country, addressBody.country);
  TestValidator.equals(
    "is_default is false when not specified",
    address.is_default,
    false,
  );
  // 5. Verify customer relationship matches authenticated customer
  TestValidator.equals(
    "customer id matches authenticated customer",
    address.customer.id,
    authorized.id,
  );
}
