import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_admin_update_with_user_role_assigned(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1234",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const authorizedUser: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedUser);

  // 2. Assign 'admin' user role to the new admin user
  const userRoleCreateBody = {
    user_id: authorizedUser.id,
    role_name: "admin",
  } satisfies IShoppingMallUserRole.ICreate;

  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: userRoleCreateBody,
    });
  typia.assert(userRole);

  // 3. Update admin user profile - email and full_name
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IUpdate;

  const updatedAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.update(connection, {
      id: authorizedUser.id,
      body: updateBody,
    });
  typia.assert(updatedAdmin);

  // 4. Validate updated values
  TestValidator.equals(
    "updated email matches",
    updatedAdmin.email,
    updateBody.email,
  );
  TestValidator.equals(
    "updated full_name matches",
    updatedAdmin.full_name,
    updateBody.full_name,
  );

  // 5. Validate essential properties existence and format
  TestValidator.predicate(
    "valid UUID for admin id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      updatedAdmin.id,
    ),
  );
  TestValidator.predicate(
    "email format valid",
    /^[^@ ]+@[^@ ]+\.[^@ ]+$/.test(updatedAdmin.email),
  );
  TestValidator.predicate(
    "full_name is non-empty",
    updatedAdmin.full_name.trim().length > 0,
  );

  // 5b. Validate deleted_at nullability if present
  if (
    updatedAdmin.deleted_at !== null &&
    updatedAdmin.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at format valid",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z/.test(
        updatedAdmin.deleted_at,
      ),
    );
  }

  // 6. Test unauthorized update attempt
  // Using connection without auth headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "update admin without authentication should fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.update(unauthConn, {
        id: authorizedUser.id,
        body: updateBody,
      });
    },
  );

  // 7a. Test update with invalid data - invalid email format
  const invalidUpdateBody = {
    email: "invalid-email-format",
    full_name: updateBody.full_name,
  } satisfies IShoppingMallAdmin.IUpdate;

  await TestValidator.error(
    "update admin with invalid email format should fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.update(connection, {
        id: authorizedUser.id,
        body: invalidUpdateBody,
      });
    },
  );

  // 7b. Test update with empty full_name (should fail)
  const emptyFullNameBody = {
    email: updateBody.email,
    full_name: "  ",
  } satisfies IShoppingMallAdmin.IUpdate;

  await TestValidator.error(
    "update admin with empty full_name should fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.update(connection, {
        id: authorizedUser.id,
        body: emptyFullNameBody,
      });
    },
  );

  // 7c. Test update missing required fields
  // Since both email and full_name are required in IUpdate type, sending
  // partial data is not allowed by TS, so skip due to compile error.

  // 7d. Test update with invalid id format
  await TestValidator.error(
    "update admin with invalid id format should fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.update(connection, {
        id: "invalid-uuid-format",
        body: updateBody,
      });
    },
  );
}
