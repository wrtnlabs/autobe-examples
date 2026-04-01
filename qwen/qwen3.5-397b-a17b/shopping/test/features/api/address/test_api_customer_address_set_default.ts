import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

export async function test_api_customer_address_set_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create first address with is_default=true
  const firstAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: true,
        },
      },
    );
  typia.assert(firstAddress);
  TestValidator.predicate(
    "first address is default",
    firstAddress.is_default === true,
  );
  // 3. Create second address with is_default=true
  const secondAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: true,
        },
      },
    );
  typia.assert(secondAddress);
  TestValidator.predicate(
    "second address is default",
    secondAddress.is_default === true,
  );
  // 4. Verify both addresses belong to the same customer
  TestValidator.equals(
    "both addresses belong to same customer",
    firstAddress.customer.id,
    secondAddress.customer.id,
  );
  TestValidator.equals(
    "customer id matches authenticated user",
    firstAddress.customer.id,
    customer.id,
  );
  // 5. Verify addresses have different IDs
  TestValidator.notEquals(
    "addresses have different IDs",
    firstAddress.id,
    secondAddress.id,
  );
  // 6. Verify address data integrity - both addresses should have all required fields
  TestValidator.predicate(
    "first address has recipient name",
    firstAddress.recipient_name.length > 0,
  );
  TestValidator.predicate(
    "second address has recipient name",
    secondAddress.recipient_name.length > 0,
  );
  TestValidator.predicate(
    "first address has street address",
    firstAddress.street_address.length > 0,
  );
  TestValidator.predicate(
    "second address has street address",
    secondAddress.street_address.length > 0,
  );
}
