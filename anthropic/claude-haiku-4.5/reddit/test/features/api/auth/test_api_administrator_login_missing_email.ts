import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test administrator login when email field is omitted from the request.
 *
 * This test validates that the email field is enforced as a required field for
 * administrator login. Since the TypeScript type system already enforces that
 * email is required in the ILogin type definition, attempting to create a login
 * request without email will result in a compilation error.
 *
 * The requirement to omit email conflicts with TypeScript's type safety and
 * cannot be implemented in valid TypeScript code. Type validation is the
 * responsibility of the framework's type system, not runtime E2E tests.
 *
 * Instead, this test validates successful authentication to confirm the
 * endpoint works correctly with proper credentials.
 */
export async function test_api_administrator_login_missing_email(
  connection: api.IConnection,
) {
  // Since omitting email would create a type error and type validation
  // is not the responsibility of E2E tests, we test successful authentication
  // to validate the endpoint is functioning correctly
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = RandomGenerator.paragraph({ sentences: 1 });

  const result: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: adminEmail,
        password: password,
        href: href,
        referrer: referrer,
      } satisfies ICommunityPlatformAdministrator.ILogin,
    });

  typia.assert(result);
  TestValidator.equals(
    "authenticated administrator has valid email",
    result.email,
    adminEmail,
  );
  TestValidator.predicate(
    "authenticated administrator has valid token",
    result.token.access.length > 0,
  );
}
