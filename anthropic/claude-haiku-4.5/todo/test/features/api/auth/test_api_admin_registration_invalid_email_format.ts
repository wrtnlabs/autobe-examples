import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_admin_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Test 1: Email missing @ symbol
  await TestValidator.error(
    "registration should reject email without @ symbol",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "adminexample.com",
          password: "SecurePassword123!",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 2: Email with multiple @ symbols
  await TestValidator.error(
    "registration should reject email with multiple @ symbols",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "admin@@example.com",
          password: "SecurePassword123!",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 3: Email missing local part (before @)
  await TestValidator.error(
    "registration should reject email without local part",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "@example.com",
          password: "SecurePassword123!",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 4: Email missing domain (after @)
  await TestValidator.error(
    "registration should reject email without domain",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "admin@",
          password: "SecurePassword123!",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 5: Email with spaces
  await TestValidator.error(
    "registration should reject email with spaces",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "admin @example.com",
          password: "SecurePassword123!",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 6: Email with leading space
  await TestValidator.error(
    "registration should reject email with leading space",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: " admin@example.com",
          password: "SecurePassword123!",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 7: Email with trailing space
  await TestValidator.error(
    "registration should reject email with trailing space",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "admin@example.com ",
          password: "SecurePassword123!",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 8: Email missing TLD (top-level domain)
  await TestValidator.error(
    "registration should reject email without top-level domain",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "admin@example",
          password: "SecurePassword123!",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 9: Email with special characters in local part (invalid position)
  await TestValidator.error(
    "registration should reject email with invalid special characters",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "admin<script>@example.com",
          password: "SecurePassword123!",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 10: Email with consecutive dots
  await TestValidator.error(
    "registration should reject email with consecutive dots",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "admin..name@example.com",
          password: "SecurePassword123!",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 11: Empty email string
  await TestValidator.error(
    "registration should reject empty email",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "",
          password: "SecurePassword123!",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 12: Email with only whitespace
  await TestValidator.error(
    "registration should reject email with only whitespace",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: "   ",
          password: "SecurePassword123!",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Test 13: Valid email registration should succeed
  const validEmail = typia.random<string & tags.Format<"email">>();
  const adminResponse: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: validEmail,
        password: "SecurePassword123!",
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(adminResponse);
  TestValidator.equals(
    "registered admin email should match input",
    adminResponse.email,
    validEmail,
  );
}
