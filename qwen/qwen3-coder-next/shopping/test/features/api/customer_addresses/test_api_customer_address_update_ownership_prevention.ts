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

export async function test_api_customer_address_update_ownership_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two customer accounts
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Customer A creates an address
  const address =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerAConnection,
      {},
    );
  typia.assert(address);
  // 3. Customer B attempts to update Customer A's address
  await TestValidator.error(
    "customer B cannot update customer A's address",
    async () => {
      await api.functional.ecommerceMall.customer.addresses.update(
        customerBConnection,
        {
          addressId: address.id,
          body: {
            recipient_name: "Hacker Name",
            phone_number: "01099998888",
            street_address: "Invasive Street 123",
            city: "Seoul",
            state_province: "Seoul",
            postal_code: "12345",
            country: "Korea",
          } satisfies IEcommerceMallAddress.IUpdate,
        },
      );
    },
  );
  // 4. Verify address data unchanged
  const refreshedAddress =
    await api.functional.ecommerceMall.customer.addresses.update(
      customerAConnection,
      {
        addressId: address.id,
        body: {},
      },
    );
  typia.assert(refreshedAddress);
  TestValidator.equals(
    "address recipient name unchanged",
    refreshedAddress.recipient_name,
    address.recipient_name,
  );
}