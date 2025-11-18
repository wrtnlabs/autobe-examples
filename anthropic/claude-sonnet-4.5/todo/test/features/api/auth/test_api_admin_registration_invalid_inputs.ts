import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validates admin registration rejects invalid inputs.
 *
 * Verifies that the admin join endpoint strictly enforces all registration
 * property requirements:
 *
 * - Business email must be provided and in correct format
 * - Password must be at least 8 characters, plain text, and not weak
 * - Href and referrer must be present (URIs)
 * - Required properties cannot be omitted or null
 * - IP is optional but must be valid IPv4/IPv6 if present, or null
 *
 * For each invalid payload, expects clear validation rejection and no account
 * creation.
 */
export async function test_api_admin_registration_invalid_inputs(
  connection: api.IConnection,
) {
  // 1. Missing email
  await TestValidator.error("missing email is rejected", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        password: "password123",
        href: "https://admin-app.company.io/signup",
        referrer: "https://company.io/landing",
      } as any, // Type error, but shown for scope - will not compile.
    });
  });

  // 2. Invalid email format
  await TestValidator.error("invalid email format is rejected", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: "user@@company",
        password: "password123",
        href: "https://admin-app.company.io/signup",
        referrer: "https://company.io/landing",
      } as any,
    });
  });

  // 3. Short password (less than 8 chars)
  await TestValidator.error("password too short is rejected", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: "admin@company.io",
        password: "1234567",
        href: "https://admin-app.company.io/signup",
        referrer: "https://company.io/landing",
      } as any,
    });
  });

  // 4. Missing href
  await TestValidator.error("missing href is rejected", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: "admin@company.io",
        password: "password123",
        referrer: "https://company.io/landing",
      } as any,
    });
  });

  // 5. Missing referrer
  await TestValidator.error("missing referrer is rejected", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: "admin@company.io",
        password: "password123",
        href: "https://admin-app.company.io/signup",
      } as any,
    });
  });

  // 6. Invalid IP format
  await TestValidator.error("invalid IP format is rejected", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: "admin@company.io",
        password: "password123",
        href: "https://admin-app.company.io/signup",
        referrer: "https://company.io/landing",
        ip: "not_an_ip",
      } as any,
    });
  });

  // 7. Null for non-nullable required field (email)
  await TestValidator.error("null email is rejected", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: null,
        password: "password123",
        href: "https://admin-app.company.io/signup",
        referrer: "https://company.io/landing",
      } as any,
    });
  });

  // 8. All fields omitted
  await TestValidator.error("all fields missing is rejected", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {} as any,
    });
  });
}
