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

export async function test_api_customer_address_update_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. First customer joins and creates an address
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Auth = await authorize_customer_join(customer1Connection, {});
  typia.assert(customer1Auth);
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customer1Connection,
    {},
  );
  typia.assert(address);
  // 2. Second customer joins
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Auth = await authorize_customer_join(customer2Connection, {});
  typia.assert(customer2Auth);
  // 3. Second customer attempts to update first customer's address (should fail)
  const updateBody: IShoppingMallAddress.IUpdate = {
    recipientName: RandomGenerator.name(),
    recipientPhone: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(),
    state: RandomGenerator.name(),
    postalCode: typia.random<string>(),
    country: RandomGenerator.name(),
    isDefault: false,
  } satisfies IShoppingMallAddress.IUpdate;
  await TestValidator.error(
    "second customer cannot update first customer's address",
    async () => {
      await api.functional.shoppingMall.customer.addresses.update(
        customer2Connection,
        {
          addressId: address.id,
          body: updateBody,
        },
      );
    },
  );
}
