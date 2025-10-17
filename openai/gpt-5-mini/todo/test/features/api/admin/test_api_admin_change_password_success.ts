import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_change_password_success(
  connection: api.IConnection,
) {
  // 1) Prepare unique admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12); // >= 8 chars

  // 2) Create admin account (join)
  const authorized: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });
  // Validate shape and important fields
  typia.assert(authorized);
  TestValidator.predicate(
    "created_at should be present",
    typeof authorized.created_at === "string" &&
      authorized.created_at.length > 0,
  );
  TestValidator.predicate(
    "token.access should be present",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );

  // Ensure that server did not echo any password fields
  // (IAuthorized does not include password fields by design; check stringification as an extra guard)
  TestValidator.predicate(
    "authorized response must not contain password or hash",
    !JSON.stringify(authorized).toLowerCase().includes("password") &&
      !JSON.stringify(authorized).toLowerCase().includes("password_hash") &&
      !JSON.stringify(authorized).toLowerCase().includes("hash"),
  );

  // 3) Change password using authenticated context (SDK sets Authorization after join)
  const newPassword = RandomGenerator.alphaNumeric(12);
  const result: ITodoAppAdmin.IMessage =
    await api.functional.auth.admin.password.change.changePassword(connection, {
      body: {
        currentPassword: adminPassword,
        newPassword: newPassword,
      } satisfies ITodoAppAdmin.IChangePassword,
    });
  typia.assert(result);

  // 4) Validate response message and ensure no secrets are leaked
  TestValidator.predicate(
    "change password returned message",
    typeof result.message === "string" && result.message.length > 0,
  );
  TestValidator.predicate(
    "message must not include sensitive keywords",
    !result.message.toLowerCase().includes("password") &&
      !result.message.toLowerCase().includes("hash"),
  );

  // Note: The original scenario requested checking updated_at >= created_at, but
  // changePassword returns ITodoAppAdmin.IMessage only and does not include updated timestamps.
  // This test therefore asserts feasible business outcomes: successful operation
  // (no thrown error), presence of a human message, and that no secrets were returned.
}
