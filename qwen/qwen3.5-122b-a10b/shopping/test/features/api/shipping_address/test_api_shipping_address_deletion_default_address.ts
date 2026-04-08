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
 * Test customer default shipping address deletion workflow.
 *
 * Validates the complete flow of deleting a default shipping address, ensuring the address is properly soft-deleted and the default designation is removed from the system. This test confirms that customers can remove their default address and that the system handles the deletion correctly.
 *
 * The test verifies the business rule that deleting a default address removes the default designation, requiring the customer to set a new default if desired. Since no list endpoint is available in the provided SDK, deletion is verified by confirming the erase operation completes successfully without errors.
 *
 * 1. Authenticate as a customer via customer join endpoint.
 * 2. Create a shipping address with is_default=true flag.
 * 3. Verify the address is correctly marked as default in the response.
 * 4. Delete the default address via the erase endpoint.
 * 5. Confirm deletion completed successfully (204 No Content response).
 * 6. Note: List endpoint not available in SDK, so full verification of default removal is limited to successful deletion confirmation.
 */
export async function test_api_shipping_address_deletion_default_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create a default shipping address
  const address = await generate_random_ecommerce_customer_addresses_create(
    customerConnection,
    {
      body: {
        is_default: true,
      },
    },
  );
  typia.assert(address);
  // 3. Verify the address is marked as default
  TestValidator.equals("address is default", address.is_default, true);
  // 4. Delete the default address
  await api.functional.ecommerce.customer.addresses.erase(customerConnection, {
    addressId: address.id,
  });
  // 5. Verify deletion completed successfully (no error thrown means success)
  // The erase endpoint returns void on success (204 No Content)
  // Note: List endpoint not available in SDK to verify default designation removal
}
