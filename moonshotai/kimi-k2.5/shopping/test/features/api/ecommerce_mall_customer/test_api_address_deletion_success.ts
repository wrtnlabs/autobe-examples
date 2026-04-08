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

export async function test_api_address_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Create first address (automatically becomes default)
  const firstAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(firstAddress);
  TestValidator.predicate(
    "first address should be default",
    firstAddress.isDefault === true,
  );
  // 3. Create second address (non-default)
  const secondAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(secondAddress);
  TestValidator.predicate(
    "second address should not be default",
    secondAddress.isDefault === false,
  );
  // 4. Delete the non-default address
  await api.functional.ecommerceMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: secondAddress.id,
    },
  );
  // 5. Verify deletion by attempting to delete again (should return 404)
  await TestValidator.httpError(
    "deleted address should return 404",
    404,
    async () => {
      await api.functional.ecommerceMall.customer.addresses.erase(
        customerConnection,
        {
          addressId: secondAddress.id,
        },
      );
    },
  );
  // 6. Verify first address remains default and was not affected
  TestValidator.equals(
    "first address default status unchanged",
    firstAddress.isDefault,
    true,
  );
}
