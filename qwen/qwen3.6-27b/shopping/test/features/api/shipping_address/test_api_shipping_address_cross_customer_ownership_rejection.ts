import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test that retrieving a shipping address with a mismatched customer ID results in a 404 error due to ownership verification.
 *
 * Validates that the admin address retrieval endpoint enforces customer ownership rules. When an admin attempts to access a shipping address using a customerId that does not match the address's actual owner, the request is rejected with a 404 response. This confirms that addresses remain scoped to their owning customer and cannot be accessed via a different customer's identifier.
 *
 * Two separate customers are created to establish the ownership mismatch scenario.
 *
 * 1. Admin joins and authenticates for administrative access.
 * 2. First customer (owner) joins and creates a shipping address.
 * 3. Second customer joins to provide a non-matching customerId.
 * 4. Admin retrieves the address using the second customer's ID and the first customer's address ID.
 * 5. Validates the endpoint returns 404 Not Found due to ownership mismatch.
 */
export async function test_api_shipping_address_cross_customer_ownership_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. First customer (owner) joins and creates shipping address
  const customerAConnection: api.IConnection = { host: connection.host };
  const authorizedCustomerA: IEcommercePlatformCustomer.IAuthorized =
    await authorize_customer_join(customerAConnection, {});
  const customerAId: string & tags.Format<"uuid"> = authorizedCustomerA.id;
  const shippingAddress: IEcommercePlatformShippingAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerAConnection,
      {},
    );
  typia.assert(shippingAddress);
  // 3. Second customer joins to provide non-matching customerId
  const customerBConnection: api.IConnection = { host: connection.host };
  const authorizedCustomerB: IEcommercePlatformCustomer.IAuthorized =
    await authorize_customer_join(customerBConnection, {});
  const customerBId: string & tags.Format<"uuid"> = authorizedCustomerB.id;
  // 4. Admin attempts to retrieve address using non-owner customerId - should fail with 404
  await TestValidator.httpError(
    "404 when address belongs to different customer",
    404,
    async () =>
      await api.functional.ecommercePlatform.admin.customers.addresses.at(
        adminConnection,
        {
          customerId: customerBId,
          addressId: shippingAddress.id,
        },
      ),
  );
}
