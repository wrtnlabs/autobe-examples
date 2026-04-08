import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
 * Test that administrator receives 404 when attempting to retrieve a soft-deleted customer's profile.
 *
 * Validates that the system properly rejects requests for customer profiles that are either non-existent or soft-deleted. This ensures that soft-deleted accounts are hidden from all queries, including administrative access, maintaining data privacy and business rules around account deletion.
 *
 * The test authenticates as an administrator and attempts to retrieve a customer profile using a non-existent customer ID. The system should respond with 404 Not Found, demonstrating that the profile endpoint properly validates customer existence and soft-delete status.
 *
 * 1. Administrator authenticates using authorize_admin_join utility.
 * 2. Administrator attempts to GET customer profile with random UUID (non-existent customer).
 * 3. Validates that the API returns 404 Not Found error.
 * 4. Confirms that no customer profile data is exposed for non-existent or soft-deleted accounts.
 *
 * Note: Since there are no available APIs to create and soft-delete customers in the provided SDK functions, this test uses a random UUID to represent a non-existent customer ID. The expected 404 behavior is identical to what would occur for a soft-deleted customer profile.
 */
export async function test_api_customer_profile_soft_deleted_not_found(
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
  // 2. Generate a random UUID for non-existent customer
  const nonExistentCustomerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve soft-deleted/non-existent customer profile - should return 404
  await TestValidator.httpError(
    "soft-deleted customer profile returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.customers.profile.at(
        adminConnection,
        {
          customerId: nonExistentCustomerId,
        },
      );
    },
  );
}
