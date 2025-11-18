import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Validate updating an administrator account's permitted fields (email,
 * display_name).
 *
 * Steps:
 *
 * 1. Register adminA and obtain credentials and adminId.
 * 2. Register adminB with a different email for duplicate check later.
 * 3. Use adminA's credentials to perform a permitted profile update: change email
 *    and display_name.
 * 4. Confirm only allowed fields are updated, immutables (id, created_at) are not.
 * 5. Verify updated_at timestamp is advanced.
 * 6. Attempt to update to a duplicate email (adminB's email) and expect business
 *    rule error.
 */
export async function test_api_admin_profile_update_valid_fields(
  connection: api.IConnection,
) {
  // 1. Register original admin (adminA)
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminACreate = {
    email: adminAEmail,
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 2,
      wordMax: 8,
    }),
    href: "https://admin-onboarding.example.com/join",
    referrer: "https://admin-onboarding.example.com/landing",
  } satisfies ITodoListAdmin.ICreate;
  const adminA = await api.functional.auth.admin.join(connection, {
    body: adminACreate,
  });
  typia.assert(adminA);

  // 2. Register another admin (adminB) for duplicate email check
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminBCreate = {
    email: adminBEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 2,
      wordMax: 8,
    }),
    href: "https://admin-onboarding.example.com/join",
    referrer: "https://admin-onboarding.example.com/landing",
  } satisfies ITodoListAdmin.ICreate;
  const adminB = await api.functional.auth.admin.join(connection, {
    body: adminBCreate,
  });
  typia.assert(adminB);

  // 3. Update adminA's profile (email and display_name)
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newDisplayName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 8,
  });
  const updated = await api.functional.todoList.admin.admins.update(
    connection,
    {
      adminId: adminA.id,
      body: {
        email: newEmail,
        display_name: newDisplayName,
      } satisfies ITodoListAdmin.IUpdate,
    },
  );
  typia.assert(updated);
  // 4. Validate allowed fields updated, immutables remain
  TestValidator.equals("id remains unchanged", updated.id, adminA.id);
  TestValidator.equals(
    "created_at remains unchanged",
    updated.created_at,
    adminA.created_at,
  );
  TestValidator.equals("email updated", updated.email, newEmail);
  TestValidator.equals(
    "display_name updated",
    updated.display_name,
    newDisplayName,
  );
  TestValidator.notEquals(
    "updated_at advances after update",
    updated.updated_at,
    adminA.updated_at,
  );
  // 5. Try to update to a duplicate email (adminB email)
  await TestValidator.error("duplicate email causes error", async () => {
    await api.functional.todoList.admin.admins.update(connection, {
      adminId: adminA.id,
      body: { email: adminBEmail } satisfies ITodoListAdmin.IUpdate,
    });
  });
}
