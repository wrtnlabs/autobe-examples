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

export async function test_api_customer_address_default_designation_change(
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
  // 2. Create first address as default
  const address1 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: true,
        },
      },
    );
  typia.assert(address1);
  TestValidator.predicate(
    "first address is initially default",
    address1.is_default === true,
  );
  // 3. Create second address (not default - system should keep first as default)
  const address2 =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          isDefault: false,
        },
      },
    );
  typia.assert(address2);
  TestValidator.predicate(
    "second address is not default",
    address2.is_default === false,
  );
  // 4. Update second address to become default
  // This should atomically unset address1's default status
  const updatedAddress2 =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: address2.id,
        body: {
          isDefault: true,
        } satisfies IShoppingMallAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress2);
  // 5. Validate the updated address is now default
  TestValidator.predicate(
    "updated address is default",
    updatedAddress2.is_default === true,
  );
  TestValidator.equals("address ID matches", updatedAddress2.id, address2.id);
  // 6. Fetch first address to verify it's no longer default
  // This validates the atomic single-default constraint
  const refreshedAddress1 =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: address1.id,
        body: {},
      },
    );
  typia.assert(refreshedAddress1);
  TestValidator.predicate(
    "first address is no longer default after second became default",
    refreshedAddress1.is_default === false,
  );
}
