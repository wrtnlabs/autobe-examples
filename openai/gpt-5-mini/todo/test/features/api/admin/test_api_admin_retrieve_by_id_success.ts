import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminRole";

export async function test_api_admin_retrieve_by_id_success(
  connection: api.IConnection,
) {
  /**
   * Test: Successful retrieval of an administrator account by id
   *
   * Steps:
   *
   * 1. Create a new admin via POST /auth/admin/join using ITodoAppAdmin.ICreate
   * 2. Ensure join returned ITodoAppAdmin.IAuthorized and SDK set Authorization
   * 3. Call GET /todoApp/admin/admins/{adminId} using
   *    api.functional.todoApp.admin.admins.at
   * 4. Assert response matches expected admin metadata and contains no sensitive
   *    fields
   */

  // 1) Prepare sign-up payload
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const roles = ["moderator", "support", "superadmin"] as const;
  const selectedRole = RandomGenerator.pick(roles);
  const joinBody = {
    email: adminEmail,
    password: "Str0ngPass!", // satisfies MinLength<8>
    display_name: RandomGenerator.name(),
    role: selectedRole,
    href: "http://localhost/signup",
    referrer: "http://localhost/",
  } satisfies ITodoAppAdmin.ICreate;

  // 2) Create admin account (SDK will set connection.headers.Authorization)
  const authorized: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Ensure we have an id and token in the authorized payload
  TestValidator.predicate(
    "authorized contains id",
    typeof authorized.id === "string",
  );
  typia.assert<IAuthorizationToken>(authorized.token);

  // 3) Retrieve admin by id
  const admin: ITodoAppAdmin = await api.functional.todoApp.admin.admins.at(
    connection,
    {
      adminId: authorized.id,
    },
  );
  typia.assert(admin);

  // 4) Business validation assertions
  TestValidator.equals(
    "retrieved admin id matches created admin id",
    admin.id,
    authorized.id,
  );
  TestValidator.equals(
    "retrieved admin email matches input",
    admin.email,
    joinBody.email,
  );
  TestValidator.equals(
    "display_name preserved",
    admin.display_name,
    joinBody.display_name,
  );
  TestValidator.equals("role preserved", admin.role, joinBody.role);

  // is_active is a boolean (typia already validated, this is a business-level check)
  TestValidator.predicate(
    "is_active is boolean",
    typeof admin.is_active === "boolean",
  );

  // createdAt and updatedAt presence
  TestValidator.predicate(
    "createdAt exists",
    typeof admin.createdAt === "string" && admin.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt exists",
    typeof admin.updatedAt === "string" && admin.updatedAt.length > 0,
  );

  // 5) Ensure sensitive fields are NOT present in the returned object
  const keys = Object.keys(admin);
  TestValidator.predicate(
    "no password_hash in response",
    !keys.includes("password_hash"),
  );
  TestValidator.predicate(
    "no mfa_secret in response",
    !keys.includes("mfa_secret"),
  );
  TestValidator.predicate(
    "no mfa_backup_codes in response",
    !keys.includes("mfa_backup_codes"),
  );
}
