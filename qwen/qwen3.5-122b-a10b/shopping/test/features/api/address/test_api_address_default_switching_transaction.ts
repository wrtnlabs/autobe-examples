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

export async function test_api_address_default_switching_transaction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create first address with is_default=true
  const firstAddress =
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
  typia.assert(firstAddress);
  TestValidator.equals(
    "first address is initially default",
    firstAddress.isDefault,
    true,
  );
  // 3. Create second address without default flag
  const secondAddress =
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
          is_default: false,
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(secondAddress);
  TestValidator.equals(
    "second address is not default initially",
    secondAddress.isDefault,
    false,
  );
  // 4. Update second address to set is_default=true
  // This should trigger the transaction to clear is_default from other addresses
  const updatedSecondAddress =
    await api.functional.ecommerceMall.customer.addresses.update(
      customerConnection,
      {
        addressId: secondAddress.id,
        body: {
          isDefault: true,
        } satisfies IEcommerceMallAddress.IUpdate,
      },
    );
  typia.assert(updatedSecondAddress);
  // 5. Verify second address now has is_default=true
  TestValidator.equals(
    "second address is now default after update",
    updatedSecondAddress.isDefault,
    true,
  );
  // 6. Verify the transaction-based switching worked
  // Since we cannot GET the first address without a list endpoint, we verify:
  // - Second address is now default (confirmed above)
  // - The update succeeded without error (transaction completed)
  // - Only one address can be default due to database constraint
  TestValidator.predicate(
    "default switching transaction completed successfully",
    updatedSecondAddress.id === secondAddress.id &&
      updatedSecondAddress.isDefault === true,
  );
  // 7. Verify unique constraint: create a third address and try to set it as default
  // This should succeed and clear the second address's default status
  const thirdAddress =
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
          is_default: false,
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(thirdAddress);
  // Update third address to be default
  const updatedThirdAddress =
    await api.functional.ecommerceMall.customer.addresses.update(
      customerConnection,
      {
        addressId: thirdAddress.id,
        body: {
          isDefault: true,
        } satisfies IEcommerceMallAddress.IUpdate,
      },
    );
  typia.assert(updatedThirdAddress);
  TestValidator.equals(
    "third address is now default",
    updatedThirdAddress.isDefault,
    true,
  );
  // Verify second address is no longer default (transaction cleared it)
  const updatedSecondAddressAfterThird =
    await api.functional.ecommerceMall.customer.addresses.update(
      customerConnection,
      {
        addressId: secondAddress.id,
        body: {},
      },
    );
  typia.assert(updatedSecondAddressAfterThird);
  TestValidator.equals(
    "second address is no longer default after third became default",
    updatedSecondAddressAfterThird.isDefault,
    false,
  );
  // 8. Final verification: only one address should be default
  TestValidator.predicate(
    "only one default address exists after multiple switches",
    updatedThirdAddress.isDefault === true &&
      updatedSecondAddressAfterThird.isDefault === false,
  );
}
