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

/**
 * Test customer address retrieval with default flag validation.
 * 1. Customer authenticates via join
 * 2. Create first address with isDefault=true
 * 3. Create second address with isDefault=false
 * 4. Retrieve both addresses and validate isDefault flags
 */
export async function test_api_customer_address_retrieval_default_flag(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create default address
  const defaultAddress =
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
  typia.assert(defaultAddress);
  // 3. Create non-default address
  const nonDefaultAddress =
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
  typia.assert(nonDefaultAddress);
  // 4. Retrieve default address and validate
  const retrievedDefault =
    await api.functional.ecommerceMall.customer.addresses.at(
      customerConnection,
      {
        addressId: defaultAddress.id,
      },
    );
  typia.assert(retrievedDefault);
  // 5. Retrieve non-default address and validate
  const retrievedNonDefault =
    await api.functional.ecommerceMall.customer.addresses.at(
      customerConnection,
      {
        addressId: nonDefaultAddress.id,
      },
    );
  typia.assert(retrievedNonDefault);
  // 6. Validate isDefault flags
  TestValidator.equals(
    "default address isDefault flag",
    retrievedDefault.isDefault,
    true,
  );
  TestValidator.equals(
    "non-default address isDefault flag",
    retrievedNonDefault.isDefault,
    false,
  );
  TestValidator.equals(
    "default address IDs match",
    retrievedDefault.id,
    defaultAddress.id,
  );
  TestValidator.equals(
    "non-default address IDs match",
    retrievedNonDefault.id,
    nonDefaultAddress.id,
  );
}
