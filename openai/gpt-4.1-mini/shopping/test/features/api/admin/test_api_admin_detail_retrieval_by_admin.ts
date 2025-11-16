import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registers by joining (to get auth token)
  const createAdminBody1 = {
    email: `admin${RandomGenerator.alphaNumeric(12)}@company.com`,
    name: RandomGenerator.name(),
    password: "password1234!",
    phone_number: null,
    role: "superadmin",
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuthorized1 = await api.functional.auth.admin.join(connection, {
    body: createAdminBody1,
  });
  typia.assert(adminAuthorized1);

  // 2. Create another admin user for test data retrieval
  const createAdminBody2 = {
    email: `admin${RandomGenerator.alphaNumeric(12)}@company.com`,
    name: RandomGenerator.name(),
    password: "password1234!",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const createdAdmin = await api.functional.shoppingMall.admin.admins.create(
    connection,
    {
      body: createAdminBody2,
    },
  );
  typia.assert(createdAdmin);

  // 3. Retrieve the admin details by adminId
  const retrievedAdmin = await api.functional.shoppingMall.admin.admins.at(
    connection,
    {
      adminId: createdAdmin.id,
    },
  );
  typia.assert(retrievedAdmin);

  // 4. Validate key properties of the retrieved admin
  TestValidator.equals(
    "retrieved admin id matches created",
    retrievedAdmin.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "retrieved admin email matches created",
    retrievedAdmin.email,
    createdAdmin.email,
  );
  TestValidator.equals(
    "retrieved admin name matches created",
    retrievedAdmin.name,
    createdAdmin.name,
  );
  TestValidator.equals(
    "retrieved admin role matches created",
    retrievedAdmin.role,
    createdAdmin.role,
  );
  TestValidator.equals(
    "retrieved admin is_active is a boolean",
    typeof retrievedAdmin.is_active,
    "boolean",
  );
  TestValidator.predicate(
    "retrieved admin created_at is ISO 8601 date-time",
    /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}.*$/i.test(
      retrievedAdmin.created_at,
    ),
  );
  TestValidator.predicate(
    "retrieved admin updated_at is ISO 8601 date-time",
    /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}.*$/i.test(
      retrievedAdmin.updated_at,
    ),
  );

  // 5. Attempt to retrieve non-existent admin and catch error
  await TestValidator.error(
    "retrieving non-existent admin should fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.at(connection, {
        adminId: typia.random<string & tags.Format<"uuid">>(), // random UUID probably non-existent
      });
    },
  );
}
