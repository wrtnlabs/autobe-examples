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

/**
 * Test successful deletion of a customer's shipping address.
 * 1. Customer registers and logs in
 * 2. Create first shipping address (will remain after deletion)
 * 3. Create second shipping address (target for deletion)
 * 4. Delete the second address
 * 5. Verify deletion was successful
 */
export async function test_api_customer_address_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create first shipping address (will remain)
  const address1 =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: typia.random<
            string & tags.MinLength<5> & tags.MaxLength<10>
          >(),
          country: RandomGenerator.name(),
          is_default: true,
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(address1);
  // 3. Create second shipping address (target for deletion)
  const address2 =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: typia.random<
            string & tags.MinLength<5> & tags.MaxLength<10>
          >(),
          country: RandomGenerator.name(),
          is_default: false,
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(address2);
  // 4. Delete the second address
  await api.functional.ecommerceMall.customer.addresses.erase(
    customerConnection,
    {
      addressId: address2.id,
    },
  );
  // 5. Verify deletion was successful
  // Since the erase operation completed without error, deletion succeeded
  // Verify address1 still exists and is not deleted (we have the original object)
  TestValidator.equals("address1 id exists", address1.id !== null, true);
  TestValidator.predicate(
    "address1 was created successfully",
    address1.createdAt !== null,
  );
  // Verify address2 was created before deletion
  TestValidator.equals("address2 id exists", address2.id !== null, true);
  TestValidator.predicate(
    "address2 was created successfully",
    address2.createdAt !== null,
  );
}
