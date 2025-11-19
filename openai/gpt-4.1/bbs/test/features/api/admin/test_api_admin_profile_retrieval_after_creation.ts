import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validates retrieval of admin profile immediately after account creation.
 *
 * This test registers a new administrator using the join endpoint, obtains the
 * new admin's UUID, then retrieves the admin profile with the returned UUID
 * using the corresponding profile GET endpoint. It asserts that all required
 * profile fields are present, precisely match the registration data, and follow
 * expected format and nullability constraints. Additional checks ensure that a
 * soft-deleted (deactivated) admin account does not get returned (error
 * expectation), verifying the access control and soft deletion policy.
 *
 * Steps:
 *
 * 1. Register an admin account via POST /auth/admin/join.
 * 2. Retrieve the admin's profile with GET /discussionBoard/admin/admins/{adminId}
 *    using the new UUID.
 * 3. Assert presence and correctness of fields: id, email, created_at, updated_at,
 *    deleted_at.
 * 4. Soft-delete the admin (if API existed this would be called here, but skip
 *    actual deletion in this test suite).
 * 5. (Skipped - no delete endpoint). Optionally check error on deleted admin if
 *    delete supported; not implemented here.
 */
export async function test_api_admin_profile_retrieval_after_creation(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const registrationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin-join-test.example.com/register",
    referrer: "https://admin-join-test.example.com/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: registrationBody,
  });
  typia.assert(adminAuth);

  // 2. Retrieve the admin's profile using the returned UUID
  const adminProfile = await api.functional.discussionBoard.admin.admins.at(
    connection,
    { adminId: adminAuth.id },
  );
  typia.assert(adminProfile);

  // 3. Assert presence and correctness of all critical fields
  TestValidator.equals(
    "admin email should match registration",
    adminProfile.email,
    registrationBody.email,
  );
  TestValidator.equals(
    "admin id should match between join & profile",
    adminProfile.id,
    adminAuth.id,
  );
  TestValidator.predicate(
    "created_at must be valid ISO date string",
    typeof adminProfile.created_at === "string" &&
      adminProfile.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be valid ISO date string",
    typeof adminProfile.updated_at === "string" &&
      adminProfile.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at should be null for active accounts",
    adminProfile.deleted_at,
    null,
  );
}
