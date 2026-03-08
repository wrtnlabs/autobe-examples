import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

export async function test_api_customer_address_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create a shipping address
  const address =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: RandomGenerator.alphabets(5),
          country: RandomGenerator.name(),
          is_default: true,
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(address);
  // 3. Retrieve the address by ID
  const retrieved = await api.functional.ecommerceMall.customer.addresses.at(
    customerConnection,
    {
      addressId: address.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate response fields match created address
  TestValidator.equals("address ID matches", retrieved.id, address.id);
  TestValidator.equals(
    "recipient name matches",
    retrieved.recipientName,
    address.recipientName,
  );
  TestValidator.equals(
    "phone number matches",
    retrieved.phoneNumber,
    address.phoneNumber,
  );
  TestValidator.equals(
    "street address matches",
    retrieved.streetAddress,
    address.streetAddress,
  );
  TestValidator.equals("city matches", retrieved.city, address.city);
  TestValidator.equals(
    "state/province matches",
    retrieved.stateProvince,
    address.stateProvince,
  );
  TestValidator.equals(
    "postal code matches",
    retrieved.postalCode,
    address.postalCode,
  );
  TestValidator.equals("country matches", retrieved.country, address.country);
  TestValidator.equals(
    "is default matches",
    retrieved.isDefault,
    address.isDefault,
  );
  // 5. Validate customer summary is included
  TestValidator.equals(
    "customer ID matches",
    retrieved.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrieved.customer.email,
    customerAuth.email,
  );
  TestValidator.equals(
    "customer display name matches",
    retrieved.customer.display_name,
    customerAuth.display_name,
  );
  TestValidator.equals(
    "customer phone number matches",
    retrieved.customer.phone_number,
    customerAuth.phone_number,
  );
}
