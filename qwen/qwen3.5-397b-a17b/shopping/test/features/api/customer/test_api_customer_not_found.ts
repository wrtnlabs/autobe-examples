import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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
 * Test that the system returns 404 when an administrator attempts to retrieve a non-existent customer account.
 *
 * Validates the business rule that soft-deleted or non-existent customers should not be accessible through the admin customer retrieval endpoint. This test ensures proper error handling when administrators query for customers that have been permanently removed or never existed.
 *
 * The test flow includes administrator authentication followed by attempting to fetch a customer with a randomly generated UUID that does not correspond to any existing customer record in the database.
 *
 * 1. Administrator account is created and authenticated using authorize_admin_join utility.
 * 2. Admin calls GET /shoppingMall/admin/customers/{customerId} with a valid UUID format that does not exist.
 * 3. Validates that the API throws an HttpError with status 404 Not Found.
 * 4. Confirms the error handling mechanism works correctly for user management workflows.
 */
export async function test_api_customer_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate a non-existent customer UUID
  const nonExistentCustomerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent customer - should throw 404
  await TestValidator.httpError(
    "non-existent customer returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.customers.at(adminConnection, {
        customerId: nonExistentCustomerId,
      });
    },
  );
}
