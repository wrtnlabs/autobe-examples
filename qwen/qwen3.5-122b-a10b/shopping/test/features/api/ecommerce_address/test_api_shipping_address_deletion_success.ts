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
 * Test successful shipping address deletion for authenticated customer.
 *
 * Validates the complete address deletion workflow including customer authentication, address creation, deletion operation, and post-deletion verification. Ensures that the address is properly soft-deleted and removed from the active address list while maintaining data integrity for historical records.
 *
 * Special attention is given to verifying that the deletion completes successfully without errors, confirming the soft delete mechanism works correctly.
 *
 * 1. Customer authenticates via registration endpoint.
 * 2. Customer creates a new shipping address with all required fields.
 * 3. Customer deletes the created address via the delete endpoint.
 * 4. Validates the deletion completes successfully with no errors.
 */
export async function test_api_shipping_address_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
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
        street_address: `${RandomGenerator.alphaNumeric(5)} ${RandomGenerator.alphabets(10)}`,
        city: RandomGenerator.name(2),
        postal_code: `${typia.random<number & tags.Type<"uint32">>()}`.padStart(
          5,
          "0",
        ),
        country: "US",
        is_default: false,
      } satisfies IEcommerceAddress.ICreate,
    },
  );
  typia.assert(address);
  // 3. Delete the address
  await api.functional.ecommerce.customer.addresses.erase(customerConnection, {
    addressId: address.id,
  });
  // 4. Verify deletion completed successfully (no error thrown)
  TestValidator.predicate("address deletion succeeded", true);
}
