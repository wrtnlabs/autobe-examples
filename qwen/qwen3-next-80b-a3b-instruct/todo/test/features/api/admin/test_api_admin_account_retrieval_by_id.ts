import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";

export async function test_api_admin_account_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create an admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64);
  const role = "admin";

  const createdAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
        role: role,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Retrieve the admin account using its id
  const retrievedAdmin: ITodoAppAdmin =
    await api.functional.todoApp.admin.admins.at(connection, {
      adminId: createdAdmin.id,
    });
  typia.assert(retrievedAdmin);

  // Step 3: Verify that the retrieved admin includes expected fields
  TestValidator.equals("admin email matches", retrievedAdmin.email, adminEmail);
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedAdmin.created_at !== undefined,
  );
  TestValidator.predicate(
    "last_login is valid date-time",
    retrievedAdmin.last_login !== undefined,
  );

  // Step 4: Verify that non-existent admin id returns 404
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent admin id returns 404", async () => {
    await api.functional.todoApp.admin.admins.at(connection, {
      adminId: nonExistentId,
    });
  });
}
