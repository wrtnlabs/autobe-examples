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

export async function test_api_customer_address_update_deleted_address_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Create a shipping address with all required fields
  const address = await api.functional.eCommerceMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 2 }),
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(5),
        country: "United States",
      } satisfies IECommerceMallCustomerAddress.ICreate,
    },
  );
  typia.assert(address);
  // Soft-delete the address
  await api.functional.eCommerceMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: address.id,
    },
  );
  // Attempt to update the deleted address — expect 404 Not Found
  await TestValidator.httpError(
    "update deleted address rejected with 404",
    404,
    async () => {
      await api.functional.eCommerceMall.customer.addresses.update(
        customerConnection,
        {
          addressId: address.id,
          body: {
            recipient_name: "Updated Name",
          } satisfies IECommerceMallCustomerAddress.IUpdate,
        },
      );
    },
  );
}
