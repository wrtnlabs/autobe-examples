import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate admin can read another user's full details, enforcing security
 * invariants.
 *
 * Steps:
 *
 * 1. Register admin and establish admin session.
 * 2. Create a user by triggering password reset (to ensure user exists in the
 *    database).
 * 3. As admin, retrieve the user's full details by userId (note: with only reset
 *    API, userId is not trackable to email--simulate with random UUID).
 * 4. Verify that only public/audit fields are present and sensitive fields (like
 *    password_hash) are never exposed.
 * 5. Confirm that deleted_at is null (user is active).
 */
export async function test_api_admin_user_detail_access_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://admin-join.example.com",
    referrer: "https://google.com",
    ip: null,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(adminAuth);

  // 2. Create a user by password reset trigger (serves only to ensure user could exist)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const resetBody = {
    email: userEmail,
  } satisfies ICommunityPlatformUser.IResetPasswordRequest;
  const resetResp = await api.functional.auth.user.password.reset.resetPassword(
    connection,
    { body: resetBody },
  );
  typia.assert(resetResp);

  // 3. Retrieve a user profile as admin (API does not associate email-userId, so random uuid used)
  const userId = typia.random<string & tags.Format<"uuid">>();
  const user = await api.functional.communityPlatform.admin.users.at(
    connection,
    { userId },
  );
  typia.assert(user);

  // 4. Assert sensitive fields are never present
  TestValidator.predicate(
    "user response must never include password_hash field",
    !("password_hash" in user),
  );

  // 5. Check all public/audit fields exist and deleted_at indicates user is active
  TestValidator.predicate(
    "user id must be non-empty string (uuid)",
    typeof user.id === "string" && user.id.length >= 36,
  );
  TestValidator.predicate(
    "user email must look valid",
    typeof user.email === "string" && user.email.includes("@"),
  );
  TestValidator.predicate(
    "user display_name is non-empty",
    typeof user.display_name === "string" && user.display_name.length > 0,
  );
  TestValidator.predicate(
    "created_at must be ISO string",
    typeof user.created_at === "string" && user.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at must be ISO string",
    typeof user.updated_at === "string" && user.updated_at.includes("T"),
  );
  TestValidator.predicate(
    "deleted_at is null (user is active)",
    user.deleted_at === null,
  );
}
