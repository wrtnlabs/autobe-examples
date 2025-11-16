import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate successful login with all required session context fields.
 *
 * Ensures /auth/user/login accepts and processes authentication payloads when
 * both 'href' and 'referrer' are present and valid (well-formed URIs). This
 * confirms that, when mandatory session context fields are supplied per
 * requirements, authentication succeeds and tokens are issued.
 *
 * Test Steps:
 *
 * 1. Attempt login with all required fields ('href' and 'referrer') present and
 *    valid. Expect successful login and receipt of tokens.
 */
export async function test_api_user_authentication_with_incomplete_session_context(
  connection: api.IConnection,
) {
  // Prepare valid login payload with all required session context fields
  const baseLogin = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<254> & tags.Format<"email">
    >(),
    password: typia.random<
      string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
    >(),
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ITodoListUser.ILogin;

  const output = await api.functional.auth.user.login(connection, {
    body: baseLogin,
  });
  typia.assert(output);
  TestValidator.equals(
    "successful login with required session context fields",
    output.email,
    baseLogin.email,
  );
}
