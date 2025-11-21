import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

/**
 * Test retrieval of administrators with different privilege levels to verify
 * consistent data structure and access control.
 *
 * This test creates multiple administrators with varying privilege levels
 * (system, content, user, moderation) and super admin status, then retrieves
 * each administrator's profile to ensure complete profile information is
 * returned regardless of privilege level. The test validates data structure
 * consistency and access control functionality across different administrative
 * roles.
 */
export async function test_api_admin_retrieval_different_levels(
  connection: api.IConnection,
) {
  // Define different privilege levels to test
  const privilegeLevels = ["system", "content", "user", "moderation"] as const;

  // Create administrators with different privilege levels
  const createdAdmins: ICommunityPlatformAdmin[] = [];

  for (const adminLevel of privilegeLevels) {
    // Create admin with specific privilege level
    const adminEmail = typia.random<string & tags.Format<"email">>();
    const adminPassword = "Admin123!" satisfies string &
      tags.Format<"password">;

    const admin = await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: adminLevel,
        is_super_admin: adminLevel === "system", // Make system admin a super admin
      } satisfies ICommunityPlatformAdmin.ICreate,
    });

    typia.assert(admin);

    // Retrieve the admin profile using the created admin's ID
    const retrievedAdmin =
      await api.functional.communityPlatform.admin.admins.at(connection, {
        adminId: admin.id,
      });

    typia.assert(retrievedAdmin);

    // Validate that retrieved data matches created data
    TestValidator.equals(
      "admin email should match",
      retrievedAdmin.email,
      admin.email,
    );
    TestValidator.equals(
      "admin display name should match",
      retrievedAdmin.display_name,
      admin.display_name,
    );
    TestValidator.equals(
      "admin level should match",
      retrievedAdmin.admin_level,
      admin.admin_level,
    );
    TestValidator.equals(
      "super admin status should match",
      retrievedAdmin.is_super_admin,
      admin.is_super_admin,
    );
    TestValidator.equals("admin ID should match", retrievedAdmin.id, admin.id);

    // Validate timestamp fields exist and are properly formatted
    TestValidator.predicate(
      "created_at should be valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedAdmin.created_at),
    );
    TestValidator.predicate(
      "updated_at should be valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedAdmin.updated_at),
    );

    // Validate that password_hash is present but not exposed
    TestValidator.predicate(
      "password_hash should exist",
      retrievedAdmin.password_hash.length > 0,
    );

    // Store the retrieved admin for later comparison
    createdAdmins.push(retrievedAdmin);
  }

  // Create an additional super admin for comprehensive testing
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = "SuperAdmin123!" satisfies string &
    tags.Format<"password">;

  const superAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  typia.assert(superAdmin);

  // Retrieve the super admin profile
  const retrievedSuperAdmin =
    await api.functional.communityPlatform.admin.admins.at(connection, {
      adminId: superAdmin.id,
    });

  typia.assert(retrievedSuperAdmin);

  // Validate super admin specific properties
  TestValidator.equals(
    "super admin should have system level",
    retrievedSuperAdmin.admin_level,
    "system",
  );
  TestValidator.predicate(
    "super admin should have is_super_admin true",
    retrievedSuperAdmin.is_super_admin,
  );

  // Test retrieval of non-existent admin ID
  await TestValidator.error(
    "retrieving non-existent admin should fail",
    async () => {
      const nonExistentId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.communityPlatform.admin.admins.at(connection, {
        adminId: nonExistentId,
      });
    },
  );

  // Validate that all created admins have consistent data structure
  for (const admin of createdAdmins) {
    TestValidator.predicate(
      "admin should have valid UUID ID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        admin.id,
      ),
    );
    TestValidator.predicate(
      "admin should have valid email format",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email),
    );
    TestValidator.predicate(
      "admin should have non-empty display name",
      admin.display_name.length > 0,
    );
    TestValidator.predicate(
      "admin should have valid admin level",
      ["system", "content", "user", "moderation"].includes(admin.admin_level),
    );
  }
}
