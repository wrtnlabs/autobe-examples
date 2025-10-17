import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin account creation via the auth join endpoint and deletion via admin
 * delete.
 *
 * The test performs the following steps:
 *
 * 1. Create (join) a new administrator account with realistic data, verifying its
 *    authorization token.
 * 2. Extract the created admin's ID from the authorization response.
 * 3. Invoke the delete API to erase the administrator account by ID.
 * 4. Assert that deletion completes without error and returns no content.
 *
 * This scenario validates the critical workflow of admin management, ensuring
 * secure authorization before deletion and correctness of data returned in
 * admin creation. Business rules such as status enum and email format are
 * followed in test data generation.
 */
export async function test_api_admin_account_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a new admin via the join endpoint
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Extract the ID of the created admin
  const adminId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(authorizedAdmin.id);

  // 3. Delete the newly created admin account
  await api.functional.shoppingMall.admin.admins.eraseAdmin(connection, {
    id: adminId,
  });

  // 4. Confirm deletion completed without error (no content returned)

  // No further assertions needed; absence of exceptions indicates success
}
