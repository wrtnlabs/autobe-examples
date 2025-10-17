import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_admin_update_user_audit_and_response_hygiene(
  connection: api.IConnection,
) {
  // 1) Create a regular user (public join)
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userAuth: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "UserPass123!",
        display_name: RandomGenerator.name(),
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(userAuth);

  // Store original created/updated timestamps for later comparison
  const originalCreatedAt = userAuth.created_at;
  const originalUpdatedAt = userAuth.updated_at;

  // 2) Create an admin account so the connection becomes authenticated as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminAuth: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        is_super: true,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 3) Perform admin update: change display_name only (IUpdate allows display_name)
  const newDisplayName = RandomGenerator.name();
  const updated: ITodoAppUser = await api.functional.todoApp.admin.users.update(
    connection,
    {
      userId: userAuth.id,
      body: {
        display_name: newDisplayName,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updated);

  // 4) Business assertions
  TestValidator.equals(
    "display_name updated",
    updated.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "email remains unchanged",
    updated.email,
    userAuth.email,
  );

  // updated_at should be greater than or equal to created_at
  TestValidator.predicate(
    "updated_at is not older than created_at",
    new Date(updated.updated_at) >= new Date(updated.created_at),
  );

  // Ensure response does not expose password_hash (response hygiene)
  TestValidator.predicate(
    "response does not expose password_hash",
    Object.prototype.hasOwnProperty.call(updated, "password_hash") === false,
  );

  // 5) Negative test: updating a non-existent user should throw (404 or similar)
  await TestValidator.error(
    "updating non-existent user should fail",
    async () => {
      await api.functional.todoApp.admin.users.update(connection, {
        userId: typia.random<string & tags.Format<"uuid">>(),
        body: { display_name: "ghost" } satisfies ITodoAppUser.IUpdate,
      });
    },
  );

  // Note: Audit record verification is not possible without a dedicated audit
  // listing endpoint. In environments exposing audit endpoints, add a step to
  // query the admin audit log and assert an entry like:
  // { admin_id: adminAuth.id, action_type: 'update_user', target_id: userAuth.id }
}
