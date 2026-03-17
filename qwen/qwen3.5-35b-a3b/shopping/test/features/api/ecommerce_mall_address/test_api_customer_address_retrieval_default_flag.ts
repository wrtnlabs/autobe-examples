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

export async function test_api_customer_address_retrieval_default_flag(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(customer);
  // 2. Create first address (should become default automatically)
  const firstAddress: IEcommerceMallAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          recipient_phone: RandomGenerator.mobile(),
          street: typia.random<string>(),
          city: typia.random<string>(),
          state: typia.random<string>(),
        },
      },
    );
  typia.assert(firstAddress);
  // Validate first address is default
  TestValidator.equals(
    "first address is_default flag",
    firstAddress.is_default,
    true,
  );
  // 3. Create second address (should NOT be default)
  const secondAddress: IEcommerceMallAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          recipient_phone: RandomGenerator.mobile(),
          street: typia.random<string>(),
          city: typia.random<string>(),
          state: typia.random<string>(),
        },
      },
    );
  typia.assert(secondAddress);
  // Validate second address is NOT default
  TestValidator.equals(
    "second address is_default flag",
    secondAddress.is_default,
    false,
  );
  // 4. Set second address as default
  const updatedSecondAddress: IEcommerceMallAddress =
    await api.functional.ecommerceMall.customer.addresses._default.setDefault(
      customerConnection,
      {
        addressId: secondAddress.id,
      },
    );
  typia.assert(updatedSecondAddress);
  // Validate second address is now default
  TestValidator.equals(
    "updated second address is_default flag",
    updatedSecondAddress.is_default,
    true,
  );
  // 5. Retrieve first address and verify it's NOT default anymore
  const retrievedFirstAddress: IEcommerceMallAddress =
    await api.functional.ecommerceMall.customer.addresses.at(
      customerConnection,
      {
        addressId: firstAddress.id,
      },
    );
  typia.assert(retrievedFirstAddress);
  // Validate first address is no longer default
  TestValidator.equals(
    "retrieved first address is_default flag",
    retrievedFirstAddress.is_default,
    false,
  );
  // 6. Retrieve second address and verify it's still default
  const retrievedSecondAddress: IEcommerceMallAddress =
    await api.functional.ecommerceMall.customer.addresses.at(
      customerConnection,
      {
        addressId: secondAddress.id,
      },
    );
  typia.assert(retrievedSecondAddress);
  // Validate second address is still default
  TestValidator.equals(
    "retrieved second address is_default flag",
    retrievedSecondAddress.is_default,
    true,
  );
  // 7. Verify all address fields are correctly returned
  TestValidator.equals(
    "first address recipient_name",
    retrievedFirstAddress.recipient_name,
    firstAddress.recipient_name,
  );
  TestValidator.equals(
    "first address recipient_phone",
    retrievedFirstAddress.recipient_phone,
    firstAddress.recipient_phone,
  );
  TestValidator.equals(
    "first address street",
    retrievedFirstAddress.street,
    firstAddress.street,
  );
  TestValidator.equals(
    "first address city",
    retrievedFirstAddress.city,
    firstAddress.city,
  );
  TestValidator.equals(
    "first address state",
    retrievedFirstAddress.state,
    firstAddress.state,
  );
  TestValidator.equals(
    "second address recipient_name",
    retrievedSecondAddress.recipient_name,
    secondAddress.recipient_name,
  );
  TestValidator.equals(
    "second address recipient_phone",
    retrievedSecondAddress.recipient_phone,
    secondAddress.recipient_phone,
  );
  TestValidator.equals(
    "second address street",
    retrievedSecondAddress.street,
    secondAddress.street,
  );
  TestValidator.equals(
    "second address city",
    retrievedSecondAddress.city,
    secondAddress.city,
  );
  TestValidator.equals(
    "second address state",
    retrievedSecondAddress.state,
    secondAddress.state,
  );
  // 8. Verify only one address is default
  const addressesWithDefault: IEcommerceMallAddress[] = [
    retrievedFirstAddress,
    retrievedSecondAddress,
  ];
  const defaultCount: number = addressesWithDefault.filter(
    (addr) => addr.is_default,
  ).length;
  TestValidator.equals("only one default address", defaultCount, 1);
  // 9. Verify address IDs are unique
  TestValidator.notEquals(
    "addresses have unique IDs",
    firstAddress.id,
    secondAddress.id,
  );
  // 10. Verify address belongs to correct customer
  TestValidator.equals(
    "first address belongs to customer",
    retrievedFirstAddress.ecommerce_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "second address belongs to customer",
    retrievedSecondAddress.ecommerce_mall_customer_id,
    customer.id,
  );
}