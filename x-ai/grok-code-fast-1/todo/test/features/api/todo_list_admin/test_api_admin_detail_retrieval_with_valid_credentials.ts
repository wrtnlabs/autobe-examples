import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Validates retrieval of an administrator's own account details via privileged
 * access.
 *
 * 1. Registers a new admin via POST /auth/admin/join with valid random data.
 * 2. Extracts issued adminId (UUID) and uses provided token.
 * 3. Retrieves admin profile using /todoList/admin/admins/{adminId} endpoint with
 *    privileges.
 * 4. Verifies response strictly adheres to ITodoListAdmin contract and does not
 *    leak sensitive fields.
 */
export async function test_api_admin_detail_retrieval_with_valid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin and establish credentials
  const displayName = RandomGenerator.name(2);
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: displayName,
    href: "https://admin.todo.local/auth/register",
    referrer: "https://admin.todo.local/",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoListAdmin.ICreate;
  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(authorizedAdmin);

  // Step 2: Retrieve admin profile by UUID with an authenticated session
  const adminId = authorizedAdmin.id;
  const adminProfile = await api.functional.todoList.admin.admins.at(
    connection,
    {
      adminId,
    },
  );
  typia.assert(adminProfile);

  // Step 3: Validate contract and profile details
  TestValidator.equals("admin profile id matches", adminProfile.id, adminId);
  TestValidator.equals(
    "admin profile email matches",
    adminProfile.email,
    adminCreateBody.email,
  );
  TestValidator.equals(
    "admin profile display_name matches",
    adminProfile.display_name,
    displayName,
  );
  TestValidator.predicate(
    "admin profile created_at is ISO date-time",
    typeof adminProfile.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
        adminProfile.created_at,
      ),
  );
  TestValidator.predicate(
    "admin profile updated_at is ISO date-time",
    typeof adminProfile.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
        adminProfile.updated_at,
      ),
  );
  if (
    adminProfile.deleted_at !== null &&
    adminProfile.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "admin profile deleted_at is ISO date-time (if present)",
      typeof adminProfile.deleted_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
          adminProfile.deleted_at,
        ),
    );
  }
}
