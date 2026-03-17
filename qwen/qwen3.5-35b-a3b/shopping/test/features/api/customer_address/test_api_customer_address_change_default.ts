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

export async function test_api_customer_address_change_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Create first address using customer connection
  const firstAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          recipient_phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.paragraph({ sentences: 1 }),
          state: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(firstAddress);
  // 3. Create second address using customer connection
  const secondAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          recipient_phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.paragraph({ sentences: 1 }),
          state: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(secondAddress);
  // 4. Set second address as default
  const updatedSecondAddress =
    await api.functional.ecommerceMall.customer.addresses._default.setDefault(
      customerConnection,
      {
        addressId: secondAddress.id,
      },
    );
  typia.assert(updatedSecondAddress);
  // 5. Validate second address is now default
  TestValidator.equals(
    "second address is now default",
    updatedSecondAddress.is_default,
    true,
  );
  TestValidator.equals(
    "second address id matches",
    updatedSecondAddress.id,
    secondAddress.id,
  );
  TestValidator.equals(
    "second address recipient name",
    updatedSecondAddress.recipient_name,
    secondAddress.recipient_name,
  );
}
