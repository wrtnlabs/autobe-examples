import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_administrator_registration_invalid_url_href(
  connection: api.IConnection,
) {
  // Test 1: Invalid href - malformed URL (missing scheme)
  await TestValidator.error(
    "malformed href without scheme should be rejected",
    async () => {
      await api.functional.auth.administrator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(12),
          username: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          href: "not-a-valid-url",
        } satisfies ICommunityPlatformAdministrator.ICreate,
      });
    },
  );

  // Test 2: Invalid href - relative path instead of absolute URL
  await TestValidator.error(
    "relative path href should be rejected",
    async () => {
      await api.functional.auth.administrator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(12),
          username: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          href: "/admin/register",
        } satisfies ICommunityPlatformAdministrator.ICreate,
      });
    },
  );

  // Test 3: Invalid href - incomplete URL with spaces
  await TestValidator.error("URL with spaces should be rejected", async () => {
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://example .com/register",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  });

  // Test 4: Invalid href - invalid scheme
  await TestValidator.error(
    "invalid URI scheme should be rejected",
    async () => {
      await api.functional.auth.administrator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(12),
          username: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          href: "ftp://invalid-admin-url",
        } satisfies ICommunityPlatformAdministrator.ICreate,
      });
    },
  );

  // Test 5: Invalid href - URL with invalid characters
  await TestValidator.error(
    "URL with invalid characters should be rejected",
    async () => {
      await api.functional.auth.administrator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(12),
          username: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          href: "http://example.com/<script>alert('xss')</script>",
        } satisfies ICommunityPlatformAdministrator.ICreate,
      });
    },
  );

  // Test 6: Valid registration with proper href for comparison
  const validAdmin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      href: "https://example.com/admin/register",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(validAdmin);
  TestValidator.predicate(
    "valid registration should succeed with correct href format",
    validAdmin.id !== undefined && validAdmin.email !== undefined,
  );
}
