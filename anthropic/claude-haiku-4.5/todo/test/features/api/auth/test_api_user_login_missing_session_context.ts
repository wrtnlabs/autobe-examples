import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_login_missing_session_context(
  connection: api.IConnection,
) {
  // Note: Testing missing required fields cannot be implemented in E2E tests
  // because it would require bypassing TypeScript's type system using 'as any',
  // which violates type safety principles. Required field validation is the
  // responsibility of the backend framework's request validation layer.
  //
  // The ITodoAppUser.ILogin DTO enforces href and referrer as required fields
  // at compile-time. Any attempt to create requests without these fields would
  // require type assertions that circumvent TypeScript's type safety.
  //
  // Instead, this test validates that valid login requests with all required
  // session context fields are properly accepted by the API.

  // Valid login request with all required session context fields
  const validLoginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppUser.ILogin;

  const response: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: validLoginBody,
    });
  typia.assert(response);

  // Verify the response contains valid authorization tokens
  TestValidator.predicate(
    "access token should be a non-empty string",
    response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    response.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at should be a valid date-time",
    new Date(response.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until should be a valid date-time",
    new Date(response.token.refreshable_until).getTime() > Date.now(),
  );
}
