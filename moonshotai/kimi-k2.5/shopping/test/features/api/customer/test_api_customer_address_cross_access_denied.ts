import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { prepare_random_ecommerce_mall_customer } from "../../../prepare/prepare_random_ecommerce_mall_customer";

/**
 * Test security boundary preventing customers from accessing other customers' addresses.
 * Customer A creates a shipping address. Customer B authenticates and attempts to retrieve
 * Customer A's address using Customer A's addressId. The system must reject this unauthorized
 * access attempt by returning a 404 Not Found response to prevent address ID enumeration attacks.
 */
export async function test_api_customer_address_cross_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Customer A account and establish authenticated session
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Customer A creates a shipping address
  const address =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerAConnection,
      {},
    );
  typia.assert(address);
  // 3. Create Customer B account (separate customer)
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Customer B attempts to access Customer A's address - should return 404
  await TestValidator.httpError(
    "unauthorized access returns 404 not found for security",
    404,
    async () => {
      await api.functional.ecommerceMall.customer.addresses.at(
        customerBConnection,
        {
          addressId: address.id,
        },
      );
    },
  );
}
