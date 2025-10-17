import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_update_profile_by_super_admin(
  connection: api.IConnection,
) {
  // Purpose: Ensure a super-admin can update another admin's non-sensitive fields
  // Strategy:
  // 1) Create a super-admin using a dedicated connection (so its token is isolated)
  // 2) Create a target admin using another dedicated connection
  // 3) Use the super-admin connection (with its Authorization set by join) to call update
  // 4) Validate returned summary for persisted changes and timestamp coherence

  // Use dedicated connection copies so join() will set Authorization on them
  const superConn: api.IConnection = { ...connection, headers: {} };
  const targetConn: api.IConnection = { ...connection, headers: {} };

  // 1) Create super-admin
  const superEmail = typia.random<string & tags.Format<"email">>();
  const superAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(superConn, {
      body: {
        email: superEmail,
        password: "SuperSecret123!",
        is_super: true,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(superAdmin);

  // 2) Create target admin account
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(targetConn, {
      body: {
        email: targetEmail,
        password: "TargetPass123!",
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(targetAdmin);
  const targetId = targetAdmin.id;

  // 3) Prepare update payload: change email and last_active_at
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newLastActive = new Date().toISOString();

  // 4) Call update as super-admin
  const updated: ITodoAppAdmin.ISummary =
    await api.functional.todoApp.admin.admins.update(superConn, {
      adminId: targetId,
      body: {
        email: newEmail,
        last_active_at: newLastActive,
      } satisfies ITodoAppAdmin.IUpdate,
    });
  typia.assert(updated);

  // 5) Assertions
  TestValidator.equals("updated admin id matches target", updated.id, targetId);
  TestValidator.equals(
    "updated admin email persisted",
    updated.email,
    newEmail,
  );
  TestValidator.equals(
    "is_super unchanged",
    updated.is_super,
    targetAdmin.is_super,
  );

  // Ensure last_active_at was set and is chronologically >= created_at
  TestValidator.predicate(
    "last_active_at exists",
    updated.last_active_at !== null && updated.last_active_at !== undefined,
  );

  TestValidator.predicate(
    "last_active_at is >= created_at",
    Date.parse(updated.last_active_at ?? "") >= Date.parse(updated.created_at),
  );

  // Audit verification omitted: no audit-listing API provided in SDK materials.
}
