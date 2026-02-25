import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_me_addresses_create } from "../../../generate/generate_random_ecommerce_customer_me_addresses_create";
import { prepare_random_ecommerce_customer_address } from "../../../prepare/prepare_random_ecommerce_customer_address";

export async function test_api_customer_address_update_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // 2. Create initial address
  const address = await generate_random_ecommerce_customer_me_addresses_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 2 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postal_code: typia.random<string & tags.Pattern<"[0-9]{5}">>(),
        country: "United States",
      } satisfies IEcommerceCustomerAddress.ICreate,
    },
  );
  typia.assert(address);
  // 3. Update address excluding country field
  const updatedAddress =
    await api.functional.ecommerce.customer.addresses.update(
      customerConnection,
      {
        addressId: address.id,
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(),
          state: RandomGenerator.name(),
          postal_code: typia.random<string & tags.Pattern<"[0-9]{5}">>(),
          // country field excluded as per scenario
        } satisfies IEcommerceCustomerAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress);
  // 4. Verify business logic
  TestValidator.equals("address ID matches", updatedAddress.id, address.id);
  TestValidator.notEquals(
    "country value unchanged",
    updatedAddress.country,
    address.country,
  );
}
