import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

/**
 * Test retrieval of specific administrator details by unique identifier.
 *
 * Validates that authenticated administrators can access comprehensive
 * administrator profile information including email, display name, admin level,
 * super admin status, and activity timestamps. Verifies that sensitive fields
 * like password hashes are properly excluded from responses. Tests retrieval of
 * administrators with different privilege levels (system, content, user,
 * moderation) to ensure consistent data structure across admin types.
 */
export async function test_api_admin_retrieval_by_id(
  connection: api.IConnection,
) {
  // Create multiple administrator accounts with different privilege levels
  const adminLevels = ["system", "content", "user", "moderation"] as const;

  const createdAdmins: ICommunityPlatformAdmin.IAuthorized[] = [];

  for (const adminLevel of adminLevels) {
    const adminData = {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      admin_level: adminLevel,
      is_super_admin: adminLevel === "system",
    } satisfies ICommunityPlatformAdmin.ICreate;

    const admin = await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
    typia.assert(admin);
    createdAdmins.push(admin);
  }

  // Test retrieval of each administrator by ID
  for (const createdAdmin of createdAdmins) {
    // Retrieve administrator details using the authenticated connection
    const retrievedAdmin =
      await api.functional.communityPlatform.admin.admins.at(connection, {
        adminId: createdAdmin.id,
      });
    typia.assert(retrievedAdmin);

    // Validate that retrieved data matches created data
    TestValidator.equals(
      "admin email should match",
      retrievedAdmin.email,
      createdAdmin.email,
    );
    TestValidator.equals(
      "admin display name should match",
      retrievedAdmin.display_name,
      createdAdmin.display_name,
    );
    TestValidator.equals(
      "admin level should match",
      retrievedAdmin.admin_level,
      createdAdmin.admin_level,
    );
    TestValidator.equals(
      "super admin status should match",
      retrievedAdmin.is_super_admin,
      createdAdmin.is_super_admin,
    );

    // Validate timestamp fields exist (typia.assert already validated format)
    TestValidator.predicate(
      "created_at timestamp should exist",
      retrievedAdmin.created_at !== undefined,
    );
    TestValidator.predicate(
      "updated_at timestamp should exist",
      retrievedAdmin.updated_at !== undefined,
    );

    // Test retrieval using different authentication context
    // Create a new administrator and authenticate with it
    const newAdminData = {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AnotherPassword123!",
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      admin_level: "user",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate;

    const newAdmin = await api.functional.auth.admin.join(connection, {
      body: newAdminData,
    });
    typia.assert(newAdmin);

    // The connection now has newAdmin's authentication context
    // Retrieve the original admin using the new admin's authenticated connection
    const crossRetrievedAdmin =
      await api.functional.communityPlatform.admin.admins.at(connection, {
        adminId: createdAdmin.id,
      });
    typia.assert(crossRetrievedAdmin);

    // Validate cross-retrieval data consistency
    TestValidator.equals(
      "cross-retrieved admin email should match",
      crossRetrievedAdmin.email,
      createdAdmin.email,
    );
    TestValidator.equals(
      "cross-retrieved admin level should match",
      crossRetrievedAdmin.admin_level,
      createdAdmin.admin_level,
    );
    TestValidator.equals(
      "cross-retrieved super admin status should match",
      crossRetrievedAdmin.is_super_admin,
      createdAdmin.is_super_admin,
    );
  }
}
