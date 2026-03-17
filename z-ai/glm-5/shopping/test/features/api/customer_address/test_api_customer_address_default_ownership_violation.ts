import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

export async function test_api_customer_address_default_ownership_violation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/customer/a",
      referrer: "https://test.com",
    },
  });
  // Step 2: Create an address for Customer A
  const customerAAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerAConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(1),
          stateProvince: RandomGenerator.name(1),
          postalCode: RandomGenerator.alphaNumeric(6),
          country: "United States",
        },
      },
    );
  typia.assert(customerAAddress);
  // Step 3: Create and authenticate Customer B (separate session)
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/customer/b",
      referrer: "https://test.com",
    },
  });
  // Step 4: Customer B attempts to set Customer A's address as default
  // Expected: 403 Forbidden (ownership violation)
  await TestValidator.httpError(
    "should reject setting another customer's address as default",
    403,
    async () => {
      await api.functional.shoppingMall.customer.addresses._default.updateDefault(
        customerBConnection,
        {
          addressId: customerAAddress.id,
        },
      );
    },
  );
}
