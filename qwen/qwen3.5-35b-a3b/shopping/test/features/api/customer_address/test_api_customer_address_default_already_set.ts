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

export async function test_api_customer_address_default_already_set(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration - create actor-specific connection
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
  // 2. Create address for customer - use utility function
  const address =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 3. First call to set default
  const firstSetDefault =
    await api.functional.ecommerceMall.customer.addresses._default.setDefault(
      customerConnection,
      {
        addressId: address.id,
      },
    );
  typia.assert(firstSetDefault);
  TestValidator.equals(
    "first set default is_default",
    firstSetDefault.is_default,
    true,
  );
  // 4. Second call to set default (same address) - test idempotent behavior
  const secondSetDefault =
    await api.functional.ecommerceMall.customer.addresses._default.setDefault(
      customerConnection,
      {
        addressId: address.id,
      },
    );
  typia.assert(secondSetDefault);
  TestValidator.equals(
    "second set default is_default",
    secondSetDefault.is_default,
    true,
  );
  TestValidator.equals(
    "idempotent address ID",
    firstSetDefault.id,
    secondSetDefault.id,
  );
}
