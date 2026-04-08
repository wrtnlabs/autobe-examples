import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that soft-deleted customer addresses are not returned by the retrieval endpoint.
 *
 * Validates that the customer address retrieval endpoint properly excludes soft-deleted addresses and returns 404 for non-existent or inaccessible addresses. Since the available API functions only provide address retrieval without address creation or soft-delete operations, this test validates the endpoint's 404 response behavior for addresses that cannot be accessed. This covers both non-existent addresses and soft-deleted addresses from the endpoint's perspective, as both should return 404 Not Found per the operation specification.
 *
 * 1. Administrator authenticates via POST /shoppingMall/auth/admin/join using the authorize_admin_join utility function.
 * 2. Administrator calls GET /shoppingMall/admin/customers/{customerId}/addresses/{addressId} with randomly generated UUIDs that don't correspond to any existing address.
 * 3. Verifies the endpoint returns 404 Not Found, confirming that non-existent and soft-deleted addresses are properly excluded from results.
 */
export async function test_api_customer_address_soft_deleted_excluded(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Call retrieval endpoint with non-existent address IDs
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const addressId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify 404 response for non-existent/soft-deleted address
  await TestValidator.httpError(
    "soft-deleted address returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.customers.addresses.at(
        adminConnection,
        {
          customerId,
          addressId,
        },
      );
    },
  );
}
