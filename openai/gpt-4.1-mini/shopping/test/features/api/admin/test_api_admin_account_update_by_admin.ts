import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_account_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as an admin user to acquire authorization token
  const adminCreateParams = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(50),
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    status: "active" as const,
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateParams,
    });
  typia.assert(adminAuthorized);

  // 2. Create another admin account to update
  const adminToUpdateCreateParams = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(50),
    full_name: RandomGenerator.name(3),
    phone_number: RandomGenerator.mobile(),
    status: "active" as const,
  } satisfies IShoppingMallAdmin.ICreate;
  const adminToUpdate: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.create(connection, {
      body: adminToUpdateCreateParams,
    });
  typia.assert(adminToUpdate);

  // 3. Prepare update data (email immutable, so repeated as current value)
  const updatePayload = {
    email: adminToUpdate.email,
    password_hash: RandomGenerator.alphaNumeric(50),
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    status: "active" as const,
  } satisfies IShoppingMallAdmin.IUpdate;

  // 4. Perform update admin request by ID with updated mutable fields
  const adminUpdated: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.updateAdmin(connection, {
      id: adminToUpdate.id,
      body: updatePayload,
    });
  typia.assert(adminUpdated);

  // 5. Validate response fields match the updates except email which is immutable
  TestValidator.equals(
    "email remains immutable",
    adminUpdated.email,
    adminToUpdate.email,
  );
  TestValidator.equals(
    "full_name is updated",
    adminUpdated.full_name,
    updatePayload.full_name,
  );
  TestValidator.equals(
    "phone_number is updated",
    adminUpdated.phone_number,
    updatePayload.phone_number,
  );
  TestValidator.equals(
    "status is updated",
    adminUpdated.status,
    updatePayload.status,
  );
  TestValidator.predicate(
    "password_hash is updated",
    adminUpdated.password_hash !== adminToUpdate.password_hash,
  );
}
