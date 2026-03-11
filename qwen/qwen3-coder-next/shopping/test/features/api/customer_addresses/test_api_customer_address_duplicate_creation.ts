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

export async function test_api_customer_address_duplicate_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.assert<string & tags.Format<"email"> & tags.MinLength<1>>(
      typia.random<string & tags.Format<"email">>(),
    ),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEcommerceMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // 2. Create two identical addresses
  const addressData = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "South Korea",
    is_default: true,
  } satisfies IEcommerceMallAddress.ICreate;
  const address1 = await api.functional.ecommerceMall.customer.addresses.create(
    customerConnection,
    { body: addressData },
  );
  typia.assert(address1);
  const address2 = await api.functional.ecommerceMall.customer.addresses.create(
    customerConnection,
    { body: addressData },
  );
  typia.assert(address2);
  // 3. Validate both addresses have same content but different IDs
  TestValidator.notEquals("IDs differ", address1.id, address2.id);
  TestValidator.equals(
    "recipient_name matches",
    address1.recipient_name,
    addressData.recipient_name,
  );
  TestValidator.equals(
    "phone_number matches",
    address1.phone_number,
    addressData.phone_number,
  );
  TestValidator.equals(
    "street_address matches",
    address1.street_address,
    addressData.street_address,
  );
  TestValidator.equals("city matches", address1.city, addressData.city);
  TestValidator.equals(
    "state_province matches",
    address1.state_province,
    addressData.state_province,
  );
  TestValidator.equals(
    "postal_code matches",
    address1.postal_code,
    addressData.postal_code,
  );
  TestValidator.equals(
    "country matches",
    address1.country,
    addressData.country,
  );
  // 4. Validate is_default behavior (first address becomes default)
  TestValidator.equals("first address is default", address1.is_default, true);
  TestValidator.equals(
    "second address is not default",
    address2.is_default,
    false,
  );
}
