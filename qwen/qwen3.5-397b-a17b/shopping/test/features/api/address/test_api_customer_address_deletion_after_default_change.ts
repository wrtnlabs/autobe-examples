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

export async function test_api_customer_address_deletion_after_default_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
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
  // 2. Create first address (automatically set as default)
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
  TestValidator.predicate("first address is default", firstAddress.is_default);
  // 3. Create second address
  const secondAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: false,
        },
      },
    );
  typia.assert(secondAddress);
  TestValidator.predicate(
    "second address is not default",
    !secondAddress.is_default,
  );
  // 4. Update the second address to set it as the new default
  // This should automatically unset is_default on the first address
  const updatedSecondAddress =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: secondAddress.id,
        body: {
          isDefault: true,
        } satisfies IShoppingMallAddress.IUpdate,
      },
    );
  typia.assert(updatedSecondAddress);
  TestValidator.predicate(
    "second address is now default after update",
    updatedSecondAddress.is_default,
  );
  // 5. Delete the first address (originally default, now should be non-default)
  // This should succeed because first address is no longer the default
  await api.functional.shoppingMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: firstAddress.id,
    },
  );
  // 6. Verify first address cannot be accessed after deletion (soft-deleted)
  // Attempting to update a deleted address should fail
  await TestValidator.error("first address is soft-deleted", async () => {
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: firstAddress.id,
        body: {
          recipientName: RandomGenerator.name(),
        },
      },
    );
  });
  // 7. Verify second address remains accessible and is still the default
  const refreshedSecondAddress =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: secondAddress.id,
        body: {
          recipientName: updatedSecondAddress.recipient_name,
        } satisfies IShoppingMallAddress.IUpdate,
      },
    );
  typia.assert(refreshedSecondAddress);
  TestValidator.predicate(
    "second address remains default after first address deletion",
    refreshedSecondAddress.is_default,
  );
  TestValidator.equals(
    "second address ID unchanged",
    refreshedSecondAddress.id,
    secondAddress.id,
  );
}
