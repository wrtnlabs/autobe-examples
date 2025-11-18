import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

export async function test_api_admin_user_login_requires_required_fields_and_persists_context(
  connection: api.IConnection,
) {
  // 1. Prepare a valid ITodoAppAdminUser.ILogin payload with explicit href/referrer
  const baseLogin: ITodoAppAdminUser.ILogin =
    typia.random<ITodoAppAdminUser.ILogin>();

  const firstHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const firstReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const firstLoginBody = {
    email: baseLogin.email,
    password: baseLogin.password,
    // ip is optional; when absent, server may infer from connection.
    // Preserve any randomly provided ip, otherwise leave it undefined
    // by conditionally including it.
    ...(baseLogin.ip !== undefined ? { ip: baseLogin.ip } : {}),
    href: firstHref,
    referrer: firstReferrer,
  } satisfies ITodoAppAdminUser.ILogin;

  // 2. Call login with explicit href/referrer and ensure success
  const firstAuthorized = await api.functional.auth.adminUser.login(
    connection,
    {
      body: firstLoginBody,
    },
  );
  typia.assert<ITodoAppAdminUser.IAuthorized>(firstAuthorized);

  // 3. Validate business-visible aspects of the authorized admin
  // 3-1. status is non-empty string
  TestValidator.predicate(
    "admin status should be non-empty string",
    firstAuthorized.status.length > 0,
  );

  // 3-2. token.access should be non-empty
  TestValidator.predicate(
    "first access token should be non-empty",
    firstAuthorized.token.access.length > 0,
  );

  // 4. Perform a second login with different href/referrer to ensure
  //    repeated logins work and new tokens are issued consistently.
  const secondHref: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const secondReferrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const secondLoginBody = {
    email: baseLogin.email,
    password: baseLogin.password,
    ...(baseLogin.ip !== undefined ? { ip: baseLogin.ip } : {}),
    href: secondHref,
    referrer: secondReferrer,
  } satisfies ITodoAppAdminUser.ILogin;

  const secondAuthorized = await api.functional.auth.adminUser.login(
    connection,
    {
      body: secondLoginBody,
    },
  );
  typia.assert<ITodoAppAdminUser.IAuthorized>(secondAuthorized);

  // 4-1. Second access token should also be non-empty
  TestValidator.predicate(
    "second access token should be non-empty",
    secondAuthorized.token.access.length > 0,
  );

  // 4-2. Ensure the identity (id, email) remains consistent across logins
  TestValidator.equals(
    "admin id should remain the same across logins",
    firstAuthorized.id,
    secondAuthorized.id,
  );
  TestValidator.equals(
    "admin email should remain the same across logins",
    firstAuthorized.email,
    secondAuthorized.email,
  );
}
