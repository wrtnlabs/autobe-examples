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

export async function test_api_address_default_switch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication - create actor-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create first address (A) with is_default=true
  const addressA =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          is_default: true,
        },
      },
    );
  typia.assert(addressA);
  TestValidator.equals("address A should be default", addressA.isDefault, true);
  // 3. Create second address (B) with is_default=false
  const addressB =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          is_default: false,
        },
      },
    );
  typia.assert(addressB);
  TestValidator.equals(
    "address B should not be default",
    addressB.isDefault,
    false,
  );
  // 4. Create third address (C) with is_default=false
  const addressC =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          is_default: false,
        },
      },
    );
  typia.assert(addressC);
  TestValidator.equals(
    "address C should not be default",
    addressC.isDefault,
    false,
  );
  // 5. Set address B as the new default address
  const updatedAddressB =
    await api.functional.shoppingMall.customer.addresses._default.setDefault(
      customerConnection,
      {
        addressId: addressB.id,
      },
    );
  typia.assert(updatedAddressB);
  // 6. Validate address B is now the default
  TestValidator.equals(
    "address B is now default",
    updatedAddressB.isDefault,
    true,
  );
  TestValidator.equals("address B ID matches", updatedAddressB.id, addressB.id);
  // Note: Further validation of address A and C default status changes
  // would require additional API calls to fetch the addresses again,
  // which is not part of the available SDK functions.
}
