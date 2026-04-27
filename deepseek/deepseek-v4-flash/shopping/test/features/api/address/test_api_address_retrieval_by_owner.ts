import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";

export async function test_api_address_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Create a shipping address with known values
  const addressInput = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(5),
    country: RandomGenerator.name(1),
    is_default: true,
  } satisfies IECommerceMallCustomerAddress.ICreate;
  const createdAddress =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: addressInput,
      },
    );
  typia.assert(createdAddress);
  // 3. Retrieve the address by its ID
  const retrievedAddress =
    await api.functional.eCommerceMall.customer.addresses.at(
      customerConnection,
      {
        addressId: createdAddress.id,
      },
    );
  typia.assert(retrievedAddress);
  // 4. Validate all fields match the creation input
  TestValidator.equals(
    "recipient name",
    retrievedAddress.recipient_name,
    addressInput.recipient_name,
  );
  TestValidator.equals(
    "phone number",
    retrievedAddress.phone_number,
    addressInput.phone_number,
  );
  TestValidator.equals(
    "street address",
    retrievedAddress.street_address,
    addressInput.street_address,
  );
  TestValidator.equals("city", retrievedAddress.city, addressInput.city);
  TestValidator.equals(
    "state/province",
    retrievedAddress.state_province,
    addressInput.state_province,
  );
  TestValidator.equals(
    "postal code",
    retrievedAddress.postal_code,
    addressInput.postal_code,
  );
  TestValidator.equals(
    "country",
    retrievedAddress.country,
    addressInput.country,
  );
  TestValidator.predicate("is_default is true", retrievedAddress.is_default);
  TestValidator.equals(
    "customer id matches",
    retrievedAddress.customer.id,
    authorized.id,
  );
}
