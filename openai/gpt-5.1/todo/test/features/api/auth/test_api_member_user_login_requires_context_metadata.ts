import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

/**
 * Validate member user login behavior with required context metadata.
 *
 * Business intent:
 *
 * - Ensure that a member user can successfully log in when providing valid
 *   credentials along with required session context metadata (href and referrer
 *   as valid URIs).
 * - Ensure that invalid credentials are rejected as business errors even when
 *   context metadata is present, confirming that authentication rules are
 *   enforced.
 *
 * NOTE ON SCENARIO ADAPTATION: The original scenario asked to test behavior
 * when `href`/`referrer` are missing or malformed. However,
 * ITodoAppMemberUserLogin.IRequest defines both fields as required with `string
 * & tags.Format<"uri">`, meaning that any attempt to omit or malform them would
 * violate TypeScript typing and typia validation and is not allowed in E2E test
 * code.
 *
 * Therefore, this test focuses on business-level authentication behavior using
 * only structurally valid ITodoAppMemberUserLogin.IRequest payloads.
 *
 * Steps:
 *
 * 1. Register a new member user via POST /auth/memberUser/join using a random,
 *    unique email and a known password, including valid href and referrer
 *    values.
 * 2. Perform a successful login with the same email/password and valid
 *    href/referrer, asserting that ITodoAppMemberuser.IAuthorized is returned
 *    and typia.assert passes.
 * 3. Attempt a login with the same email but an incorrect password, still
 *    providing valid href/referrer, and assert via TestValidator.error that the
 *    call fails as a business error.
 */
export async function test_api_member_user_login_requires_context_metadata(
  connection: api.IConnection,
) {
  // 1. Register a new member user with valid context metadata
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinBody = {
    email,
    password,
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const joined: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Successful login with valid credentials and context metadata
  const loginBodySuccess = {
    email,
    password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const loggedIn: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: loginBodySuccess,
    });
  typia.assert(loggedIn);

  // 3. Failed login attempt with wrong password but valid context metadata
  const wrongPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const loginBodyFailure = {
    email,
    password: wrongPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  await TestValidator.error(
    "login should fail with wrong password",
    async () => {
      await api.functional.auth.memberUser.login(connection, {
        body: loginBodyFailure,
      });
    },
  );
}
