import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_addresses_create } from "../../../generate/generate_random_ecommerce_customer_addresses_create";
import { prepare_random_ecommerce_address } from "../../../prepare/prepare_random_ecommerce_address";

export async function test_api_customer_address_limit_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Maximum address limit per customer (assumed business rule)
  const MAX_ADDRESS_LIMIT = 5;
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create addresses up to the limit
  const addresses: IEcommerceAddress[] = [];
  for (let i = 0; i < MAX_ADDRESS_LIMIT; i++) {
    const address = await generate_random_ecommerce_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: `${RandomGenerator.alphaNumeric(5)} Street`,
          city: RandomGenerator.name(2),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: "South Korea",
        } satisfies IEcommerceAddress.ICreate,
      },
    );
    typia.assert(address);
    addresses.push(address);
  }
  // Validate we have exactly MAX_ADDRESS_LIMIT addresses
  TestValidator.equals(
    "address count at limit",
    addresses.length,
    MAX_ADDRESS_LIMIT,
  );
  // 3. Attempt to create one more address beyond the limit
  await TestValidator.error("address limit exceeded", async () => {
    await generate_random_ecommerce_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: `${RandomGenerator.alphaNumeric(5)} Street`,
          city: RandomGenerator.name(2),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: "South Korea",
        } satisfies IEcommerceAddress.ICreate,
      },
    );
  });
}
