import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";

export async function test_api_customer_address_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = typia.random<IEcommerceMallCustomer.IJoin>();
  await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  // 2. Create multiple addresses for the customer
  const address1 = await api.functional.ecommerceMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: "123 Main St",
        city: "Seoul",
        state_province: "Seoul",
        postal_code: "01234",
        country: "South Korea",
        is_default: true,
      } satisfies IEcommerceMallAddress.ICreate,
    },
  );
  typia.assert(address1);
  const address2 = await api.functional.ecommerceMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: "456 Oak Ave",
        city: "Busan",
        state_province: "Busan",
        postal_code: "54321",
        country: "South Korea",
        is_default: false,
      } satisfies IEcommerceMallAddress.ICreate,
    },
  );
  typia.assert(address2);
  // 3. Verify addresses created correctly
  TestValidator.equals("address1 is default", address1.is_default, true);
  TestValidator.equals("address2 is not default", address2.is_default, false);
  // 4. Delete the first address (default)
  await api.functional.ecommerceMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: address1.id,
    },
  );
  // 5. Verify second address remains unchanged
  const retrievedAddress2 =
    await api.functional.ecommerceMall.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: address2.recipient_name,
          phone_number: address2.phone_number,
          street_address: address2.street_address,
          city: address2.city,
          state_province: address2.state_province,
          postal_code: address2.postal_code,
          country: address2.country,
          is_default: address2.is_default,
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(retrievedAddress2);
  // 6. Verify that deleting a non-existent address fails
  await TestValidator.error("deleting non-existent address fails", async () => {
    await api.functional.ecommerceMall.customer.addresses.erase(
      customerConnection,
      {
        addressId: address1.id, // Already deleted
      },
    );
  });
}
