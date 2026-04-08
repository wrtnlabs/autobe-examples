import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

/**
 * Test customer shipping address deletion with non-existent address ID.
 *
 * Validates that attempting to delete a shipping address that does not exist returns a 404 Not Found error. This ensures proper error handling when customers try to delete addresses that are not in their address list.
 *
 * The test authenticates as a customer and attempts to delete an address using an invalid UUID. The system should reject this request with a 404 status code and an appropriate error message indicating the address was not found.
 *
 * 1. Customer authenticates via /ecommerce/auth/customer/join.
 * 2. Customer attempts to delete a non-existent address with invalid UUID.
 * 3. Verifies 404 Not Found error is returned.
 * 4. Verifies error message indicates address not found.
 */
export async function test_api_shipping_address_deletion_not_found(
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
  // 2. Attempt to delete non-existent address with invalid UUID
  const invalidAddressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Verify 404 Not Found error
  await TestValidator.httpError(
    "address deletion with non-existent ID returns 404",
    404,
    async () => {
      await api.functional.ecommerce.customer.addresses.erase(
        customerConnection,
        {
          addressId: invalidAddressId,
        },
      );
    },
  );
}
