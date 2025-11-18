import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validates that an authenticated admin can correctly access detailed admin
 * profiles via adminId, both for themselves and for other admins.
 *
 * Verifies presence of all required and permitted fields in the returned
 * profile; confirms accurate lock/deletion status indicators; ensures access is
 * restricted to admins only. Covers error scenarios like attempting to fetch
 * nonexistent or soft-deleted admins.
 *
 * Steps:
 *
 * 1. Register two admins (adminA, adminB).
 * 2. As adminA, fetch their own profile by adminId and validate all fields and
 *    values.
 * 3. As adminA, fetch adminB's profile by adminId, validate data and ensure
 *    adminB's sensitive state flags are correct.
 * 4. Attempt to fetch with a random nonexistent adminId, and expect an error.
 * 5. (Optional) Simulate a deleted admin: if business logic permits, soft-delete
 *    adminB and ensure fetch returns error or appropriate marker.
 * 6. Confirm access is denied to unauthorized actors (but current API does not
 *    expose user actors, so skipped).
 */
export async function test_api_admin_detail_access_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register two admins (adminA, adminB)
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminAPassword = RandomGenerator.alphaNumeric(10) + "A!a1"; // Ensure 8+ chars
  const adminA = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminAEmail,
      password: adminAPassword,
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(adminA);

  // Switch to adminB
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminBPassword = RandomGenerator.alphaNumeric(12) + "B#b2";
  const adminB = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminBEmail,
      password: adminBPassword,
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(adminB);

  // Step 2: As adminB, access own profile (should return correct profile)
  const adminBOwnProfile = await api.functional.todoList.admin.admins.at(
    connection,
    {
      adminId: adminB.id,
    },
  );
  typia.assert(adminBOwnProfile);
  TestValidator.equals(
    "adminB own profile id matches",
    adminBOwnProfile.id,
    adminB.id,
  );
  TestValidator.equals(
    "adminB own profile email matches",
    adminBOwnProfile.email,
    adminB.email,
  );
  TestValidator.equals(
    "adminB own profile locked flag",
    adminBOwnProfile.locked,
    adminB.locked,
  );
  TestValidator.equals(
    "adminB own profile role",
    adminBOwnProfile.role,
    adminB.role,
  );
  TestValidator.equals(
    "adminB own profile deleted_at flag",
    adminBOwnProfile.deleted_at,
    adminB.deleted_at ?? null,
  );
  TestValidator.predicate(
    "adminB own profile created_at is ISO8601",
    typeof adminBOwnProfile.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(adminBOwnProfile.created_at),
  );
  TestValidator.predicate(
    "adminB own profile updated_at is ISO8601",
    typeof adminBOwnProfile.updated_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(adminBOwnProfile.updated_at),
  );

  // Step 3: As adminB, fetch adminA's profile
  const adminAProfile = await api.functional.todoList.admin.admins.at(
    connection,
    {
      adminId: adminA.id,
    },
  );
  typia.assert(adminAProfile);
  TestValidator.equals(
    "adminA profile id matches",
    adminAProfile.id,
    adminA.id,
  );
  TestValidator.equals(
    "adminA profile email matches",
    adminAProfile.email,
    adminA.email,
  );
  TestValidator.equals(
    "adminA locked flag",
    adminAProfile.locked,
    adminA.locked,
  );
  TestValidator.equals("adminA role", adminAProfile.role, adminA.role);
  TestValidator.equals(
    "adminA deleted_at flag",
    adminAProfile.deleted_at,
    adminA.deleted_at ?? null,
  );
  TestValidator.predicate(
    "adminA profile created_at is ISO8601",
    typeof adminAProfile.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(adminAProfile.created_at),
  );

  // Step 4: Try a random nonexistent adminId (expect error)
  await TestValidator.error(
    "fetch with nonexistent adminId returns error",
    async () => {
      await api.functional.todoList.admin.admins.at(connection, {
        adminId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Step 5: (Optional) Skipped as soft-delete endpoint is not available in the provided API
}
