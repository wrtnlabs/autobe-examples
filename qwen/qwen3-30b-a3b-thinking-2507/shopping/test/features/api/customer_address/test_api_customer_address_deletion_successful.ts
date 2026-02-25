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

export async function test_api_customer_address_deletion_successful(
  connection: api.IConnection,
) {
  // 1. Auth as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      href: "https://test.example.com",
      referrer: "https://test.example.com/home",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // 2. Create shipping address
  const address = await generate_random_ecommerce_customer_me_addresses_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: "New York",
        state: "NY",
        postal_code: "10001",
        country: "United States",
      } satisfies IEcommerceCustomerAddress.ICreate,
    },
  );
  // 3. Delete address
  await api.functional.ecommerce.customer.addresses.erase(customerConnection, {
    addressId: address.id,
  });
  // 4. Verification (204 response implies successful deletion)
  // No response to validate (204 No Content)
}
