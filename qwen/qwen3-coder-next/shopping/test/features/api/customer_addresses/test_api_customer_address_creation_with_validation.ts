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

export async function test_api_customer_address_creation_with_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: "1234" + RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create first address (should become default if no existing addresses)
  const firstAddressInput = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(2),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "Korea",
    is_default: true,
  } satisfies IEcommerceMallAddress.ICreate;
  const firstAddress =
    await api.functional.ecommerceMall.customer.addresses.create(
      customerConnection,
      { body: firstAddressInput },
    );
  typia.assert(firstAddress);
  // 3. Validate first address properties
  TestValidator.equals(
    "recipient name matches",
    firstAddress.recipient_name,
    firstAddressInput.recipient_name,
  );
  TestValidator.equals(
    "phone number matches",
    firstAddress.phone_number,
    firstAddressInput.phone_number,
  );
  TestValidator.equals(
    "street address matches",
    firstAddress.street_address,
    firstAddressInput.street_address,
  );
  TestValidator.equals(
    "city matches",
    firstAddress.city,
    firstAddressInput.city,
  );
  TestValidator.equals(
    "state/province matches",
    firstAddress.state_province,
    firstAddressInput.state_province,
  );
  TestValidator.equals(
    "postal code matches",
    firstAddress.postal_code,
    firstAddressInput.postal_code,
  );
  TestValidator.equals(
    "country matches",
    firstAddress.country,
    firstAddressInput.country,
  );
  TestValidator.equals("is_default is true", firstAddress.is_default, true);
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f-]{36}$/i.test(firstAddress.id),
  );
  // 4. Create second address (should not be default)
  const secondAddressInput = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(2),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: "Korea",
    is_default: false,
  } satisfies IEcommerceMallAddress.ICreate;
  const secondAddress =
    await api.functional.ecommerceMall.customer.addresses.create(
      customerConnection,
      { body: secondAddressInput },
    );
  typia.assert(secondAddress);
  // 5. Verify second address properties
  TestValidator.equals(
    "second address recipient name matches",
    secondAddress.recipient_name,
    secondAddressInput.recipient_name,
  );
  TestValidator.equals(
    "second address is_default is false",
    secondAddress.is_default,
    false,
  );
  TestValidator.notEquals(
    "addresses have different IDs",
    firstAddress.id,
    secondAddress.id,
  );
  // 6. Test validation - empty strings should fail
  await TestValidator.error("empty recipient name should fail", async () => {
    await api.functional.ecommerceMall.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: "", // Empty string should fail validation
          phone_number: "01012345678",
          street_address: "123 Test St",
          city: "Seoul",
          state_province: "Gangseo",
          postal_code: "01234",
          country: "Korea",
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  });
  // 7. Verify default address remains first
  TestValidator.equals(
    "first address is default",
    firstAddress.is_default,
    true,
  );
  TestValidator.equals(
    "second address is not default",
    secondAddress.is_default,
    false,
  );
}
