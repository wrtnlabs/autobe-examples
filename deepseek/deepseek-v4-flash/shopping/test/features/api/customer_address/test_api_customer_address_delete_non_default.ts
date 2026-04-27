import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";

export async function test_api_customer_address_delete_non_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Create the first address — the system auto-assigns is_default=true
  //    since it is the customer's first address
  const firstAddress =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(firstAddress);
  TestValidator.equals(
    "first address is set as default automatically",
    firstAddress.is_default,
    true,
  );
  // 3. Create a second address with is_default=false explicitly
  const secondAddress =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          is_default: false,
        },
      },
    );
  typia.assert(secondAddress);
  TestValidator.equals(
    "second address is non-default",
    secondAddress.is_default,
    false,
  );
  // 4. Delete the second (non-default) address — should succeed
  await api.functional.eCommerceMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: secondAddress.id,
    },
  );
  // 5. Verify: deleting the same address again returns 404 since it's already
  //    soft-deleted, confirming the deletion took effect
  await TestValidator.httpError(
    "deleting already soft-deleted address returns 404",
    404,
    async () => {
      await api.functional.eCommerceMall.customer.addresses.erase(
        customerConnection,
        {
          addressId: secondAddress.id,
        },
      );
    },
  );
}
