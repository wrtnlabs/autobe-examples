import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingBusinessSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessSetting";

/**
 * Test that an admin can successfully create a new business setting with a
 * unique setting_key, value, and description. The scenario validates creation,
 * uniqueness enforcement, and audit info is returned. Also verifies that with a
 * duplicate key, the creation fails, and non-admins are denied.
 *
 * Steps:
 *
 * 1. Register a new admin and obtain credentials (for authorization)
 * 2. As the admin, create a unique business setting
 * 3. Assert the response type and values; confirm audit fields populated
 * 4. Attempt to create a duplicate business setting with the same key; expect
 *    error
 * 5. Attempt to create a business setting without admin authorization (simulate by
 *    removing the token); expect error
 */
export async function test_api_business_settings_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword satisfies string,
    name: RandomGenerator.name(),
    role: "super", // valid privilege role - must match platform RBAC policy
    status: "active", // initial status must be valid
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);
  TestValidator.equals(
    "admin email matches join body",
    admin.email,
    adminEmail,
  );
  TestValidator.equals("admin role is super", admin.role, "super");
  TestValidator.equals("admin status is active", admin.status, "active");
  TestValidator.predicate(
    "JWT token is provided",
    !!admin.token &&
      typeof admin.token.access === "string" &&
      admin.token.access.length > 0,
  );

  // 2. Create a unique business setting as admin
  const settingKey = RandomGenerator.alphaNumeric(10);
  const createBody = {
    setting_key: settingKey,
    setting_value: RandomGenerator.alphaNumeric(15),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingBusinessSetting.ICreate;
  const created: IShoppingBusinessSetting =
    await api.functional.shopping.admin.businessSettings.create(connection, {
      body: createBody,
    });
  typia.assert(created);
  TestValidator.equals(
    "setting key matches",
    created.setting_key,
    createBody.setting_key,
  );
  TestValidator.equals(
    "setting value matches",
    created.setting_value,
    createBody.setting_value,
  );
  TestValidator.equals(
    "setting description matches",
    created.description,
    createBody.description,
  );
  TestValidator.predicate(
    "id is uuid",
    typeof created.id === "string" && /^[0-9a-f-]{36}$/.test(created.id),
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof created.created_at === "string" && created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof created.updated_at === "string" && created.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    created.deleted_at,
    null,
  );

  // 3. Attempt to create a business setting with a duplicate key (should fail)
  await TestValidator.error("duplicate setting_key should fail", async () => {
    await api.functional.shopping.admin.businessSettings.create(connection, {
      body: createBody,
    });
  });

  // 4. Attempt to create a business setting as a non-admin (missing token)
  const unauthConnection: api.IConnection = { ...connection, headers: {} }; // simulate non-admin
  const anotherSettingKey = RandomGenerator.alphaNumeric(11);
  const createBody2 = {
    setting_key: anotherSettingKey,
    setting_value: RandomGenerator.alphaNumeric(17),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingBusinessSetting.ICreate;
  await TestValidator.error(
    "non-admin must not be authorized to create",
    async () => {
      await api.functional.shopping.admin.businessSettings.create(
        unauthConnection,
        { body: createBody2 },
      );
    },
  );
}
