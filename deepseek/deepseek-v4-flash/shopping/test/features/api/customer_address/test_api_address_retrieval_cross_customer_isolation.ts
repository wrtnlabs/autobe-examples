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

/**
 * Test that a customer cannot retrieve another customer's address via data isolation enforcement.
 *
 * Validates that shipping addresses are scoped to their owning customer and are not accessible by other customers. Each address belongs exclusively to the customer who created it — another authenticated customer attempting to read it must receive a 404 Not Found response.
 *
 * The test covers cross-customer data access enforcement, ensuring that the server correctly filters address records by the authenticated customer's identity extracted from the JWT session token.
 *
 * 1. Join as customer A and create a shipping address.
 * 2. Capture the address ID from the creation response.
 * 3. Join as customer B with a separate authenticated session.
 * 4. Attempt to retrieve customer A's address using customer B's session.
 * 5. Verify that the server returns HTTP 404, confirming address isolation.
 */
export async function test_api_address_retrieval_cross_customer_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join customer A and create an address
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {});
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerAConnection,
      {},
    );
  typia.assert(address);
  // 2. Join customer B with a separate connection
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {});
  // 3. Customer B must NOT be able to retrieve customer A's address
  await TestValidator.httpError(
    "customer B cannot retrieve customer A's address",
    404,
    () =>
      api.functional.eCommerceMall.customer.addresses.at(customerBConnection, {
        addressId: address.id,
      }),
  );
}
