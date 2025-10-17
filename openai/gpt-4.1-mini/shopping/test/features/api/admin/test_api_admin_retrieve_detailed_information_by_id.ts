import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_retrieve_detailed_information_by_id(
  connection: api.IConnection,
) {
  // 1. Register a new admin to get authenticated
  const createAdminBody = {
    email: RandomGenerator.alphaNumeric(5) + "@test.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createAdminBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a new admin with admin credentials
  const createBody = {
    email: RandomGenerator.alphaNumeric(5) + "@test.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  const newAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.create(connection, {
      body: createBody,
    });
  typia.assert(newAdmin);

  TestValidator.equals(
    "created admin email matches",
    newAdmin.email,
    createBody.email,
  );
  TestValidator.equals(
    "created admin status is active",
    newAdmin.status,
    "active",
  );

  // 3. Retrieve the detailed admin info by ID
  const retrievedAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.at(connection, {
      id: newAdmin.id,
    });
  typia.assert(retrievedAdmin);

  TestValidator.equals(
    "retrieved admin id matches",
    retrievedAdmin.id,
    newAdmin.id,
  );
  TestValidator.equals(
    "retrieved admin email matches",
    retrievedAdmin.email,
    createBody.email,
  );
  TestValidator.equals(
    "retrieved admin status is active",
    retrievedAdmin.status,
    "active",
  );

  // explicit null checks if optional fields exist
  if (retrievedAdmin.full_name === undefined) {
    throw new Error("full_name should be defined, possibly null");
  }
  if (retrievedAdmin.phone_number === undefined) {
    throw new Error("phone_number should be defined, possibly null");
  }

  // 4. Error case: attempt to retrieve a non-existent admin id
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving non-existent admin should fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.at(connection, {
        id: fakeId,
      });
    },
  );
}
