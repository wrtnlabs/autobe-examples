import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

export async function test_api_admin_user_token_refresh_success_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // 1. Prepare an opaque, non-empty refresh token string
  const refreshToken: string = RandomGenerator.alphaNumeric(64);

  // 2. First refresh call using the valid-looking refresh token
  const firstAuthorized = await api.functional.auth.adminUser.refresh(
    connection,
    {
      body: {
        refresh_token: refreshToken,
      } satisfies ITodoAppAdminUser.IRefresh,
    },
  );
  typia.assert<ITodoAppAdminUser.IAuthorized>(firstAuthorized);

  // Validate identity fields basic invariants
  TestValidator.predicate(
    "admin id should be a non-empty UUID string",
    firstAuthorized.id.length > 0,
  );
  TestValidator.predicate(
    "admin email should be non-empty",
    firstAuthorized.email.length > 0,
  );
  TestValidator.predicate(
    "admin status should be non-empty",
    firstAuthorized.status.length > 0,
  );

  // created_at and updated_at should be parseable ISO date-time strings
  TestValidator.predicate(
    "created_at should be a parseable date-time string",
    () => !Number.isNaN(new Date(firstAuthorized.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at should be a parseable date-time string",
    () => !Number.isNaN(new Date(firstAuthorized.updated_at).getTime()),
  );

  // Validate token structure and semantics for first response
  const firstToken = firstAuthorized.token;
  typia.assert<IAuthorizationToken>(firstToken);

  TestValidator.predicate(
    "first access token should be non-empty",
    firstToken.access.length > 0,
  );
  TestValidator.predicate(
    "first refresh token should be non-empty",
    firstToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "first expired_at should be a parseable date-time string",
    () => !Number.isNaN(new Date(firstToken.expired_at).getTime()),
  );
  TestValidator.predicate(
    "first refreshable_until should be a parseable date-time string",
    () => !Number.isNaN(new Date(firstToken.refreshable_until).getTime()),
  );

  // 3. Second refresh call with the same refresh token
  const secondAuthorized = await api.functional.auth.adminUser.refresh(
    connection,
    {
      body: {
        refresh_token: refreshToken,
      } satisfies ITodoAppAdminUser.IRefresh,
    },
  );
  typia.assert<ITodoAppAdminUser.IAuthorized>(secondAuthorized);

  // Identity must remain stable across refresh operations
  TestValidator.equals(
    "admin id is stable across refresh",
    secondAuthorized.id,
    firstAuthorized.id,
  );
  TestValidator.equals(
    "admin email is stable across refresh",
    secondAuthorized.email,
    firstAuthorized.email,
  );
  TestValidator.equals(
    "admin status is stable across refresh",
    secondAuthorized.status,
    firstAuthorized.status,
  );

  // created_at and updated_at must remain valid date-time strings
  TestValidator.predicate(
    "second created_at should be a parseable date-time string",
    () => !Number.isNaN(new Date(secondAuthorized.created_at).getTime()),
  );
  TestValidator.predicate(
    "second updated_at should be a parseable date-time string",
    () => !Number.isNaN(new Date(secondAuthorized.updated_at).getTime()),
  );

  // Validate token rotation on second response
  const secondToken = secondAuthorized.token;
  typia.assert<IAuthorizationToken>(secondToken);

  TestValidator.predicate(
    "second access token should be non-empty",
    secondToken.access.length > 0,
  );
  TestValidator.predicate(
    "second refresh token should be non-empty",
    secondToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "second expired_at should be a parseable date-time string",
    () => !Number.isNaN(new Date(secondToken.expired_at).getTime()),
  );
  TestValidator.predicate(
    "second refreshable_until should be a parseable date-time string",
    () => !Number.isNaN(new Date(secondToken.refreshable_until).getTime()),
  );

  // 4. Assert rotation: tokens should change between refresh calls
  TestValidator.notEquals(
    "access token should rotate between refresh calls",
    secondToken.access,
    firstToken.access,
  );
  TestValidator.notEquals(
    "refresh token should rotate between refresh calls",
    secondToken.refresh,
    firstToken.refresh,
  );
}
