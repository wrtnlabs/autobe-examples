import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

/**
 * Test administrator registration with weak password that doesn't meet
 * enterprise security standards. Attempt to create an admin account with
 * passwords that are too short, lack character diversity, or don't meet
 * complexity requirements. Verify that the system enforces password strength
 * policies and rejects weak passwords with appropriate validation errors.
 */
export async function test_api_admin_registration_weak_password(
  connection: api.IConnection,
) {
  const displayName = RandomGenerator.name();
  const adminLevel = RandomGenerator.pick([
    "system",
    "content",
    "user",
    "moderation",
  ] as const);
  const isSuperAdmin = RandomGenerator.pick([true, false] as const);

  // Test 1: Password that is too short (single character)
  await TestValidator.error("password too short should fail", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "a",
        display_name: displayName,
        admin_level: adminLevel,
        is_super_admin: isSuperAdmin,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  });

  // Test 2: Password with only letters (no numbers or special characters)
  await TestValidator.error(
    "password with only letters should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "abcdefgh",
          display_name: displayName,
          admin_level: adminLevel,
          is_super_admin: isSuperAdmin,
        } satisfies ICommunityPlatformAdmin.ICreate,
      });
    },
  );

  // Test 3: Password with only numbers (no letters or special characters)
  await TestValidator.error(
    "password with only numbers should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "12345678",
          display_name: displayName,
          admin_level: adminLevel,
          is_super_admin: isSuperAdmin,
        } satisfies ICommunityPlatformAdmin.ICreate,
      });
    },
  );

  // Test 4: Common weak password
  await TestValidator.error("common weak password should fail", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password",
        display_name: displayName,
        admin_level: adminLevel,
        is_super_admin: isSuperAdmin,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  });

  // Test 5: Sequential pattern password
  await TestValidator.error(
    "sequential pattern password should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "123456789",
          display_name: displayName,
          admin_level: adminLevel,
          is_super_admin: isSuperAdmin,
        } satisfies ICommunityPlatformAdmin.ICreate,
      });
    },
  );

  // Test 6: Repeated character password
  await TestValidator.error(
    "repeated character password should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "aaaaaaaa",
          display_name: displayName,
          admin_level: adminLevel,
          is_super_admin: isSuperAdmin,
        } satisfies ICommunityPlatformAdmin.ICreate,
      });
    },
  );

  // Test 7: Empty password
  await TestValidator.error("empty password should fail", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "",
        display_name: displayName,
        admin_level: adminLevel,
        is_super_admin: isSuperAdmin,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  });

  // Test 8: Password with only whitespace
  await TestValidator.error(
    "password with only whitespace should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "       ",
          display_name: displayName,
          admin_level: adminLevel,
          is_super_admin: isSuperAdmin,
        } satisfies ICommunityPlatformAdmin.ICreate,
      });
    },
  );
}
