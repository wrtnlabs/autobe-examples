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

export async function test_api_customer_address_update_ownership_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Customer A and create an address
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  const address =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerAConnection,
      {},
    );
  typia.assert(address);
  // 2. Authenticate as Customer B using a fresh join
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 3. Attempt to update Customer A's address using Customer B's connection
  // 4. Verify the system returns a 404 response
  await TestValidator.httpError(
    "Customer B cannot update Customer A's address - returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.customer.addresses.update(
        customerBConnection,
        {
          addressId: address.id,
          body: {
            recipientName: RandomGenerator.name(),
            phoneNumber: RandomGenerator.mobile(),
            streetAddress: RandomGenerator.paragraph({ sentences: 3 }),
            city: RandomGenerator.name(),
            state: RandomGenerator.name(),
            postalCode: RandomGenerator.alphaNumeric(5),
            country: RandomGenerator.name(),
          } satisfies IEcommerceMallCustomer.IUpdate,
        },
      );
    },
  );
}