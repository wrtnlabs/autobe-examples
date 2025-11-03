import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminRole";

export async function test_api_admin_update_mutable_fields_success(
  connection: api.IConnection,
) {
  // 1) Create a new admin account via POST /auth/admin/join
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    display_name: RandomGenerator.name(),
    role: "moderator",
    href: "http://example.com",
    referrer: "http://referrer.example.com",
  } satisfies ITodoAppAdmin.ICreate;

  const authorized: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  // Validate authorized response shape and capture id
  typia.assert(authorized);
  const adminId: string = authorized.id;

  // 2) Update mutable fields via PUT /todoApp/admin/admins/{adminId}
  const newDisplayName = `Updated ${RandomGenerator.name(1)}`;
  const updateBody = {
    displayName: newDisplayName,
    role: "support",
    isActive: true,
  } satisfies ITodoAppAdmin.IUpdate;

  const updated: ITodoAppAdmin =
    await api.functional.todoApp.admin.admins.update(connection, {
      adminId,
      body: updateBody,
    });
  typia.assert(updated);

  // 3) Validate response reflects updates and preserves immutable data
  TestValidator.equals("admin id unchanged", updated.id, adminId);
  // API response uses snake_case for some fields per DTO
  TestValidator.equals(
    "display_name updated",
    updated.display_name,
    newDisplayName,
  );
  TestValidator.equals("role updated", updated.role, updateBody.role);
  TestValidator.equals(
    "is_active updated",
    updated.is_active,
    updateBody.isActive,
  );

  // 4) Timestamps: updatedAt should be equal or newer than createdAt
  const created = new Date(updated.createdAt).getTime();
  const updatedAt = new Date(updated.updatedAt).getTime();
  TestValidator.predicate(
    "updatedAt is same or after createdAt",
    updatedAt >= created,
  );

  // 5) Sensitive fields must not be present on the returned DTO
  TestValidator.predicate(
    "password_hash not returned",
    !Object.prototype.hasOwnProperty.call(updated, "password_hash"),
  );
  TestValidator.predicate(
    "mfa_secret not returned",
    !Object.prototype.hasOwnProperty.call(updated, "mfa_secret"),
  );
  TestValidator.predicate(
    "mfa_backup_codes not returned",
    !Object.prototype.hasOwnProperty.call(updated, "mfa_backup_codes"),
  );
}
