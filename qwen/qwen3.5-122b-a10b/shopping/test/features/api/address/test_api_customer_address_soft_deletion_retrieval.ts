import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_addresses_create } from "../../../generate/generate_random_ecommerce_customer_addresses_create";
import { prepare_random_ecommerce_address } from "../../../prepare/prepare_random_ecommerce_address";

/**
 * Test customer address soft deletion retrieval workflow.
 *
 * Validates that soft-deleted addresses are properly removed from active retrieval while preserving data integrity for historical order records. This test ensures the system maintains proper access control and data isolation for customer addresses.
 *
 * The test workflow includes customer registration, address creation, soft deletion, and retrieval attempt validation. After deletion, the address should be inaccessible via read operations, returning 404 Not Found.
 *
 * 1. Register a new customer account with random credentials.
 * 2. Create a shipping address with complete delivery information.
 * 3. Soft delete the address using the customer endpoint.
 * 4. Attempt to retrieve the deleted address.
 * 5. Validate that retrieval fails with 404 Not Found error.
 */
export async function test_api_customer_address_soft_deletion_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create shipping address
  const address = await generate_random_ecommerce_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 2 }),
        city: RandomGenerator.name(1),
        postal_code: typia
          .random<string & tags.Format<"uuid">>()
          .replace(/-/g, "")
          .substring(0, 6),
        country: "South Korea",
        is_default: true,
      } satisfies IEcommerceAddress.ICreate,
    },
  );
  typia.assert(address);
  // 3. Soft delete the address
  await api.functional.ecommerce.customer.addresses.erase(customerConnection, {
    addressId: address.id,
  });
  // 4. Attempt to retrieve the deleted address - should fail with 404
  await TestValidator.error("deleted address not retrievable", async () => {
    await api.functional.ecommerce.customer.addresses.at(customerConnection, {
      addressId: address.id,
    });
  });
}
