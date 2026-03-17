import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";

export async function test_api_customer_address_creation_as_default_replaces_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer and get authenticated connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create first address with isDefault=true
  const firstAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          addressLine1: "123 First Street",
          addressLine2: null,
          city: "Seoul",
          state: "Seoul",
          postalCode: "04524",
          country: "KR",
          isDefault: true,
        },
      },
    );
  typia.assert(firstAddress);
  // Verify the first address is the default
  TestValidator.equals(
    "first address is default",
    firstAddress.isDefault,
    true,
  );
  TestValidator.equals(
    "first address deletedAt is null",
    firstAddress.deletedAt,
    null,
  );
  // 3. Create second address with isDefault=true (should replace first as default)
  const secondAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          addressLine1: "456 Second Avenue",
          addressLine2: "Apt 7B",
          city: "Busan",
          state: "Busan",
          postalCode: "47999",
          country: "KR",
          isDefault: true,
        },
      },
    );
  typia.assert(secondAddress);
  // 4. Validate the second address is now the default
  TestValidator.equals(
    "second address is default",
    secondAddress.isDefault,
    true,
  );
  TestValidator.equals(
    "second address deletedAt is null",
    secondAddress.deletedAt,
    null,
  );
  // 5. Validate both addresses have unique IDs
  TestValidator.notEquals(
    "address IDs are unique",
    firstAddress.id,
    secondAddress.id,
  );
  // 6. Validate both addresses belong to the same customer
  TestValidator.equals(
    "first address customer id matches",
    firstAddress.customerId,
    authorized.id,
  );
  TestValidator.equals(
    "second address customer id matches",
    secondAddress.customerId,
    authorized.id,
  );
}
