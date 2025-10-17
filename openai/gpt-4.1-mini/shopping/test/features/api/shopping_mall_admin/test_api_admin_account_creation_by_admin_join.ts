import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_account_creation_by_admin_join(
  connection: api.IConnection,
) {
  // 1. Authenticate as an admin to obtain authorization token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(32);
  const adminFullName: string = RandomGenerator.name();
  const adminPhoneNumber: string = RandomGenerator.mobile();

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        full_name: adminFullName,
        phone_number: adminPhoneNumber,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(authorizedAdmin);

  // 2. Using the authenticated admin, create a second admin account
  const newAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const newAdminPasswordHash: string = RandomGenerator.alphaNumeric(32);
  const newAdminFullName: string = RandomGenerator.name();
  const newAdminPhoneNumber: string = RandomGenerator.mobile();

  const newAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.create(connection, {
      body: {
        email: newAdminEmail,
        password_hash: newAdminPasswordHash,
        full_name: newAdminFullName,
        phone_number: newAdminPhoneNumber,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(newAdmin);

  // 3. Validate properties of created admin
  TestValidator.predicate(
    "new admin id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      newAdmin.id,
    ),
  );
  TestValidator.equals("admin email matches", newAdmin.email, newAdminEmail);
  TestValidator.equals(
    "admin full_name matches",
    newAdmin.full_name,
    newAdminFullName,
  );
  TestValidator.equals(
    "admin phone_number matches",
    newAdmin.phone_number,
    newAdminPhoneNumber,
  );
  TestValidator.equals("admin status is active", newAdmin.status, "active");

  TestValidator.predicate(
    "new admin created_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(newAdmin.created_at),
  );
  TestValidator.predicate(
    "new admin updated_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(newAdmin.updated_at),
  );

  // 4. Test uniqueness enforcement (duplicate email fails)
  await TestValidator.error(
    "creating admin with duplicate email should fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.create(connection, {
        body: {
          email: newAdminEmail, // duplicate
          password_hash: RandomGenerator.alphaNumeric(32),
          full_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          status: "active",
        } satisfies IShoppingMallAdmin.ICreate,
      });
    },
  );

  // 5. Test unauthorized access fails: create admin with unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated creation of admin should fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.create(
        unauthenticatedConnection,
        {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            password_hash: RandomGenerator.alphaNumeric(32),
            full_name: RandomGenerator.name(),
            phone_number: RandomGenerator.mobile(),
            status: "active",
          } satisfies IShoppingMallAdmin.ICreate,
        },
      );
    },
  );
}
