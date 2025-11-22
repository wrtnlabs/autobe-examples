import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Test platform administrator registration rejection with weak password that
 * doesn't meet security requirements. Validates password complexity validation,
 * security policy enforcement, and proper error messaging. Ensures
 * administrative accounts meet platform security standards and password
 * requirements for high-privilege access.
 */
export async function test_api_platform_administrator_registration_weak_password(
  connection: api.IConnection,
) {
  // Test 1: Password too short (only 3 characters, violates minimum 8 character requirement)
  await TestValidator.error(
    "should reject password that is too short",
    async () => {
      await api.functional.auth.platformAdministrator.join(connection, {
        body: {
          username: "testadmin1",
          email: typia.random<string & tags.Format<"email">>(),
          password: "123", // Only 3 characters - violates minimum length
          administrator_level: "admin",
          system_permissions: "{}",
          security_clearance: "medium",
        } satisfies IRedditPlatformPlatformAdministrator.ICreate,
      });
    },
  );

  // Test 2: Password with insufficient complexity (7 characters - still too short)
  await TestValidator.error(
    "should reject password that is still too short",
    async () => {
      await api.functional.auth.platformAdministrator.join(connection, {
        body: {
          username: "testadmin2",
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(7), // Exactly 7 characters - still too short
          administrator_level: "admin",
          system_permissions: "{}",
          security_clearance: "medium",
        } satisfies IRedditPlatformPlatformAdministrator.ICreate,
      });
    },
  );

  // Test 3: Password meets length but lacks complexity (only lowercase letters)
  await TestValidator.error(
    "should reject password that lacks complexity requirements",
    async () => {
      await api.functional.auth.platformAdministrator.join(connection, {
        body: {
          username: "testadmin3",
          email: typia.random<string & tags.Format<"email">>(),
          password: "onlylowercase", // 13 characters but only lowercase letters
          administrator_level: "admin",
          system_permissions: "{}",
          security_clearance: "medium",
        } satisfies IRedditPlatformPlatformAdministrator.ICreate,
      });
    },
  );

  // Test 4: Different administrator level with weak password
  await TestValidator.error(
    "should reject weak password for super_admin role",
    async () => {
      await api.functional.auth.platformAdministrator.join(connection, {
        body: {
          username: "superadmin",
          email: typia.random<string & tags.Format<"email">>(),
          password: "weak", // Simple weak password
          administrator_level: "super_admin",
          system_permissions: "{}",
          security_clearance: "high",
        } satisfies IRedditPlatformPlatformAdministrator.ICreate,
      });
    },
  );

  // Test 5: Password with only numbers (lacks letter complexity)
  await TestValidator.error(
    "should reject password with only numbers",
    async () => {
      await api.functional.auth.platformAdministrator.join(connection, {
        body: {
          username: "numbersonly",
          email: typia.random<string & tags.Format<"email">>(),
          password: "12345678", // 8 characters but only numbers
          administrator_level: "moderator_admin",
          system_permissions: "{}",
          security_clearance: "low",
        } satisfies IRedditPlatformPlatformAdministrator.ICreate,
      });
    },
  );
}
