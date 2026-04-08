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

export async function test_api_customer_address_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  // 2. Create a new shipping address for the customer
  const createdAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(createdAddress);
  // 3. Retrieve the address using its UUID
  const retrievedAddress =
    await api.functional.ecommerceMall.customer.addresses.at(
      customerConnection,
      {
        addressId: createdAddress.id,
      },
    );
  typia.assert(retrievedAddress);
  // 4. Validate all expected fields match
  TestValidator.equals(
    "address id matches",
    retrievedAddress.id,
    createdAddress.id,
  );
  TestValidator.equals(
    "recipient_name matches",
    retrievedAddress.recipient_name,
    createdAddress.recipient_name,
  );
  TestValidator.equals(
    "phone matches",
    retrievedAddress.phone,
    createdAddress.phone,
  );
  TestValidator.equals(
    "street_address matches",
    retrievedAddress.street_address,
    createdAddress.street_address,
  );
  TestValidator.equals(
    "city matches",
    retrievedAddress.city,
    createdAddress.city,
  );
  TestValidator.equals(
    "state matches",
    retrievedAddress.state,
    createdAddress.state,
  );
  TestValidator.equals(
    "postal_code matches",
    retrievedAddress.postal_code,
    createdAddress.postal_code,
  );
  TestValidator.equals(
    "country matches",
    retrievedAddress.country,
    createdAddress.country,
  );
  TestValidator.equals(
    "is_default matches",
    retrievedAddress.is_default,
    createdAddress.is_default,
  );
  TestValidator.equals(
    "customer matches",
    retrievedAddress.customer.id,
    authorized.id,
  );
}
