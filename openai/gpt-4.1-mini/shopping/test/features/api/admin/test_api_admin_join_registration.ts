import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_join_registration(
  connection: api.IConnection,
) {
  // 1. Prepare admin registration data
  const email = typia.random<string & tags.Format<"email">>();
  const name = RandomGenerator.name();
  const password = `${RandomGenerator.alphaNumeric(16)}!1A`;
  const phoneNumber = RandomGenerator.pick([null, RandomGenerator.mobile()]);
  const roles = ["superadmin", "admin", "support"] as const;
  const role = RandomGenerator.pick(roles);

  const createBody = {
    email,
    name,
    password,
    phone_number: phoneNumber,
    role,
  } satisfies IShoppingMallAdmin.ICreate;

  // 2. Register a new admin user
  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 3. Validate returned data
  TestValidator.predicate(
    "admin ID is a valid UUID",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );
  TestValidator.equals("admin email matches", authorized.email, email);
  TestValidator.equals("admin name matches", authorized.name, name);
  TestValidator.predicate(
    "admin role is one of allowed roles",
    ["superadmin", "admin", "support"].includes(authorized.role),
  );
  TestValidator.predicate(
    "admin account is active",
    authorized.is_active === true,
  );
  TestValidator.predicate(
    "admin created_at is ISO string",
    typeof authorized.created_at === "string" &&
      authorized.created_at.length > 0,
  );
  TestValidator.predicate(
    "admin updated_at is ISO string",
    typeof authorized.updated_at === "string" &&
      authorized.updated_at.length > 0,
  );
  TestValidator.predicate(
    "token access string exists",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh string exists",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is ISO string",
    typeof authorized.token.expired_at === "string" &&
      authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refreshable_until is ISO string",
    typeof authorized.token.refreshable_until === "string" &&
      authorized.token.refreshable_until.length > 0,
  );

  // 4. Attempt to register the same email again and expect an error
  await TestValidator.error("duplicate email registration fails", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        name: RandomGenerator.name(),
        password: `${RandomGenerator.alphaNumeric(16)}!1A`,
        phone_number: null,
        role: RandomGenerator.pick(roles),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  });
}
