import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_customer_address_deletion_not_found_or_wrong_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as first customer
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {});
  // 2. Attempt to delete non-existent address (should return 404)
  await TestValidator.httpError(
    "non-existent address returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.customer.addresses.erase(
        customer1Connection,
        {
          addressId: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
        },
      );
    },
  );
  // 3. Create an address for the first customer
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customer1Connection,
      {},
    );
  typia.assert(address);
  // 4. Authenticate as a different customer
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {});
  // 5. Attempt to delete first customer's address with second customer's credentials (should return 404)
  await TestValidator.httpError(
    "other customer's address returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.customer.addresses.erase(
        customer2Connection,
        {
          addressId: address.id,
        },
      );
    },
  );
  // 6. Verify the first customer can still delete their own address (proving ownership is validated)
  await api.functional.ecommerceMall.customer.addresses.erase(
    customer1Connection,
    {
      addressId: address.id,
    },
  );
}
