import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful user login workflow with valid credentials. Verifies that
 * authentication returns valid access and refresh tokens when provided with a
 * registered user's email and correct password. Validates that system issues
 * appropriate JWT tokens and sets correct session state upon successful
 * authentication.
 */
export async function test_api_user_login_success(connection: api.IConnection) {
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<72>
  >();

  const loginResponse = await api.functional.auth.user.login(connection, {
    body: {
      email,
      password,
    } satisfies ITodoAppUser.ILogin,
  });

  typia.assert(loginResponse);

  TestValidator.predicate("user id should be valid UUID", () => {
    return /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
      loginResponse.id,
    );
  });
  TestValidator.predicate(
    "access token should exist",
    () => loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should exist",
    () => loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration should be valid date-time",
    () => {
      return !isNaN(Date.parse(loginResponse.token.expired_at));
    },
  );
  TestValidator.predicate(
    "refresh token expiration should be valid date-time",
    () => {
      return !isNaN(Date.parse(loginResponse.token.refreshable_until));
    },
  );
}
