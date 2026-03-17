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

export async function test_api_customer_address_update_ownership_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {});
  // Step 2: As Customer A, create a shipping address
  const customerAAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerAConnection,
      {},
    );
  typia.assert(customerAAddress);
  const customerAAddressId = customerAAddress.id;
  // Step 3: Register Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {});
  // Step 4: As Customer B, attempt to update Customer A's address → expect 403
  const updateBody = {
    recipientName: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    addressLine1: RandomGenerator.paragraph({ sentences: 1 }),
    addressLine2: null,
    city: RandomGenerator.alphabets(6),
    state: RandomGenerator.alphabets(5),
    postalCode: RandomGenerator.alphaNumeric(6),
    country: "US",
    isDefault: false,
  } satisfies IShoppingMallCustomerAddress.IUpdate;
  await TestValidator.httpError(
    "customer B cannot update customer A's address",
    403,
    async () => {
      await api.functional.shoppingMall.customer.addresses.update(
        customerBConnection,
        {
          addressId: customerAAddressId,
          body: updateBody,
        },
      );
    },
  );
}
