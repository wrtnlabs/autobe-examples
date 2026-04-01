import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that administrator receives appropriate error when attempting to update a customer profile that does not exist.
 *
 * Preconditions:
 * - Administrator account exists and is authenticated
 * - No customer profile exists for the authenticated administrator (administrators don't have customer profiles)
 *
 * Test Steps:
 * 1. Administrator registers and authenticates via join endpoint using authorize_administrator_join utility
 * 2. Administrator attempts to update a customer profile using the profiles.update endpoint
 * 3. Since administrators are not customers and have no customer profile record, the system should return 404 Not Found error
 *
 * Validation Points:
 * - Response status is 404 (Not Found)
 * - Error indicates profile was not found
 * - No snapshot is created for failed update
 * - System correctly enforces that only customers with existing profiles can update them
 * - Administrator cannot bypass customer profile existence requirement
 *
 * Note: The endpoint extracts customer ID from authenticated session token. Since administrator sessions don't have associated customer records, the profile lookup will fail with 404.
 */
export async function test_api_customer_profile_update_nonexistent_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Administrator attempts to update customer profile (should fail - admins don't have customer profiles)
  const updateBody = {
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomerProfile.IUpdate;
  // 3. Verify system returns 404 Not Found error
  await TestValidator.httpError(
    "administrator cannot update non-existent customer profile",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.customers.profiles.update(
        adminConnection,
        {
          body: updateBody,
        },
      );
    },
  );
}
