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
 * Test administrator address ownership verification security.
 *
 * Validates that the administrator endpoint correctly prevents cross-customer address access by verifying ownership. When an administrator attempts to retrieve an address using a customerId that doesn't match the address's actual owner, the system must return 404 Not Found to prevent unauthorized data access.
 *
 * This test ensures the security requirement that addresses must belong to the specified customer is enforced at the API level. The ownership verification check prevents administrators from accessing arbitrary customer addresses by manipulating the customerId parameter.
 *
 * 1. Administrator authenticates via POST /shoppingMall/auth/admin/join to obtain authorization token.
 * 2. Generate two different customer UUIDs simulating Customer A and Customer B.
 * 3. Administrator calls GET /shoppingMall/admin/customers/{customerId}/addresses/{addressId} with mismatched customerId and addressId.
 * 4. Verify the system returns 404 Not Found, confirming ownership verification is working correctly.
 */
export async function test_api_customer_address_ownership_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate two different customer UUIDs (simulating Customer A and Customer B)
  const customerAId = typia.random<string & tags.Format<"uuid">>();
  const customerBId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to access Customer B's address using Customer A's customerId
  // This should fail with 404 Not Found due to ownership verification
  await TestValidator.httpError(
    "cross-customer address access denied",
    404,
    async () => {
      await api.functional.shoppingMall.admin.customers.addresses.at(
        adminConnection,
        {
          customerId: customerAId,
          addressId: customerBId,
        },
      );
    },
  );
}
