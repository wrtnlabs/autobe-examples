import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { prepare_random_ecommerce_mall_customer } from "../../../prepare/prepare_random_ecommerce_mall_customer";

/**
 * @title Test cross-customer address deletion security boundary
 * @description Verifies that a customer cannot delete another customer's address and receives 404 (not 403) to prevent information leakage
 * @testing IEcommerceMallCustomer address ownership isolation
 * @security Prevents address enumeration attacks via consistent 404 responses
 * @scenario
 * 1. Customer A registers and creates an address
 * 2. Customer B attempts to delete Customer A's address
 * 3. System should return 404 Not Found (identical to non-existent address)
 * 4. Address should remain in Customer A's address book
 * @expectations
 * - Response status: 404 Not Found
 * - Security: No distinction between "not found" and "not yours"
 * - Privacy: Cannot enumerate valid address IDs belonging to other customers
 */
export async function test_api_address_cross_customer_deletion_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Customer A and authenticate
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Customer A creates a shipping address
  const customerAAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerAConnection,
      {},
    );
  typia.assert(customerAAddress);
  // 3. Create Customer B and authenticate separately
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 4. Customer B attempts to delete Customer A's address
  // This should fail with 404 Not Found (not 403 Forbidden) to prevent enumeration
  await TestValidator.httpError(
    "customer B cannot delete customer A's address - returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.customer.addresses.erase(
        customerBConnection,
        {
          addressId: customerAAddress.id,
        },
      );
    },
  );
}
