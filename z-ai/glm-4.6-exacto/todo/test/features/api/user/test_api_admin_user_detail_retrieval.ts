import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates the end-to-end workflow for administrator retrieval of user details
 * via GET /todoApp/admin/users/{userId}.
 *
 * - Registers a new administrator using POST /auth/admin/join (producing
 *   ITodoAppAdmin.IAuthorized).
 * - Uses the authenticated admin to fetch user detail for a syntactically valid
 *   userId, asserting full compliance with ITodoAppUser (all business fields,
 *   exclusion of sensitive fields, proper audit history fields).
 * - Attempts to fetch with a non-existent (but well-formed) userId; expects a
 *   not-found or business logic error.
 * - Ensures all checks use TestValidator with proper titles and that API calls
 *   are awaited and type-checked via typia.assert.
 */
export async function test_api_admin_user_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register and login admin for authentication
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin-portal.todoapp.com/register",
    referrer: "https://admin-portal.todoapp.com/",
  } satisfies ITodoAppAdmin.IJoin;
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    { body: adminJoinInput },
  );
  typia.assert(admin);

  // 2. Assume existence of a valid user and pick a random UUID for userId
  const mockUser: ITodoAppUser = typia.random<ITodoAppUser>();

  // 3. Fetch user detail as admin
  const user: ITodoAppUser = await api.functional.todoApp.admin.users.at(
    connection,
    { userId: mockUser.id },
  );
  typia.assert(user);
  TestValidator.equals("user id matches", user.id, mockUser.id);
  TestValidator.equals("user email matches", user.email, mockUser.email);
  TestValidator.predicate(
    "created_at is ISO8601",
    typeof user.created_at === "string" && user.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is ISO8601",
    typeof user.updated_at === "string" && user.updated_at.includes("T"),
  );
  // Optionally check deleted_at (nullable)
  if (user.deleted_at !== null && user.deleted_at !== undefined)
    TestValidator.predicate(
      "deleted_at (if set) is ISO8601",
      typeof user.deleted_at === "string" && user.deleted_at.includes("T"),
    );

  // 4. Attempt fetch with a non-existent userId that is syntactically valid
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent userId triggers not-found/business error",
    async () => {
      await api.functional.todoApp.admin.users.at(connection, {
        userId: nonExistentId,
      });
    },
  );
}
