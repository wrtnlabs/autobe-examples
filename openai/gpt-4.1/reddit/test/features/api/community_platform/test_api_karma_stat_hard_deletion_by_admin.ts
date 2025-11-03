import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates that an admin can permanently delete a user's karma statistics,
 * ensuring irreversible data removal.
 *
 * Steps:
 *
 * 1. Register a new administrator via admin join API.
 * 2. Register a new user using user join API.
 * 3. Admin invokes the hard deletion API for the user's karma statistics.
 * 4. Verify deletion by expecting an error on subsequent fetch if such a fetch
 *    endpoint exists (none exposed in e2e scope, so check deletion completes
 *    without errors and use error assertion for further action if supported in
 *    future APIs).
 */
export async function test_api_karma_stat_hard_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminDisplayName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminHref =
    "https://admin-join.example.com/" + RandomGenerator.alphaNumeric(6);
  const adminReferrer = "https://platform.example.com/home";

  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: adminDisplayName,
        href: adminHref,
        referrer: adminReferrer,
        ip: undefined,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(adminAuth);
  TestValidator.equals("admin email matches", adminAuth.email, adminEmail);
  TestValidator.equals(
    "admin display_name matches",
    adminAuth.display_name,
    adminDisplayName,
  );

  // 2. Register new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userDisplayName = RandomGenerator.name();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const userHref =
    "https://user-join.example.com/" + RandomGenerator.alphaNumeric(6);
  const userReferrer = "https://platform.example.com/home";

  const userAuth: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        display_name: userDisplayName,
        href: userHref,
        referrer: userReferrer,
        ip: undefined,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(userAuth);
  TestValidator.equals("user email matches", userAuth.email, userEmail);
  TestValidator.equals(
    "user display_name matches",
    userAuth.display_name,
    userDisplayName,
  );

  // 3. Admin deletes karma stats for user
  await api.functional.communityPlatform.admin.karmaStats.erase(connection, {
    userId: userAuth.id,
  });
  // There is no public fetch API for karma stats, so further deletion verification is best-effort.
  // If such an API is added, a negative test retrieving it and asserting error would go here.
  // For now, completion without error is sufficient to confirm deletion call worked.
}
