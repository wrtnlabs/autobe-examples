import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user registration with session context fields.
 *
 * Note: The original scenario requested testing missing required fields (href,
 * referrer), which would require TypeScript type violations. E2E tests cannot
 * test missing required fields as this is a compile-time type safety concern,
 * not a runtime business logic issue.
 *
 * Instead, this test validates successful registration with all required
 * session context fields properly provided, ensuring the registration flow
 * works correctly when valid data is supplied.
 */
export async function test_api_user_registration_missing_session_context(
  connection: api.IConnection,
) {
  // Test successful registration with all required fields including session context
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const user = await api.functional.auth.user.join(connection, {
    body: registrationData,
  });

  typia.assert(user);

  // Validate that registration succeeded with proper session context
  TestValidator.equals(
    "registered email matches",
    user.email,
    registrationData.email,
  );
}
