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

export async function test_api_customer_default_address_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer session by joining
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = (typia.random<string & tags.Format<"email">>() satisfies string as string);
  const joinInput = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // 2. Create multiple addresses
  const addresses: IEcommerceMallAddress[] = [];
  // Create first address (will be default initially)
  const addr1 = await api.functional.ecommerceMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }).trim(),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphabets(6),
        country: "Korea",
        is_default: true,
      } satisfies IEcommerceMallAddress.ICreate,
    },
  );
  typia.assert(addr1);
  addresses.push(addr1);
  // Create second address
  const addr2 = await api.functional.ecommerceMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }).trim(),
        city: RandomGenerator.name(1),
        state_province: RandomGenerator.name(1),
        postal_code: RandomGenerator.alphabets(6),
        country: "Korea",
        is_default: false,
      } satisfies IEcommerceMallAddress.ICreate,
    },
  );
  typia.assert(addr2);
  addresses.push(addr2);
  // 3. Set the second address as default
  const updatedAddress =
    await api.functional.ecommerceMall.customer.addresses._default.setDefault(
      customerConnection,
      {
        addressId: addr2.id,
        body: {},
      },
    );
  typia.assert(updatedAddress);
  // 4. Verify default address status
  TestValidator.equals(
    "target address is default",
    updatedAddress.is_default,
    true,
  );
  TestValidator.equals(
    "updated address ID matches",
    updatedAddress.id,
    addr2.id,
  );
  // 5. Verify other addresses are not default
  const addr1Again =
    await api.functional.ecommerceMall.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 1 }).trim(),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphabets(6),
          country: "Korea",
          is_default: false,
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(addr1Again);
  TestValidator.equals(
    "first address not default after change",
    addr1.is_default,
    false,
  );
  TestValidator.equals("second address is default", addr2.is_default, false);
  TestValidator.equals(
    "third address not default",
    addr1Again.is_default,
    false,
  );
}