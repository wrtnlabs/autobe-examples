import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

export async function test_api_admin_user_token_refresh_rotates_tokens_while_preserving_identity(
  connection: api.IConnection,
) {
  // 1. Prepare a refresh token payload representing an existing admin session
  const refreshBody = {
    refresh_token: RandomGenerator.alphaNumeric(64),
  } satisfies ITodoAppAdminUser.IRefresh;

  // 2. First refresh call to obtain the baseline authorized admin representation
  const firstAuthorized = await api.functional.auth.adminUser.refresh(
    connection,
    {
      body: refreshBody,
    },
  );
  typia.assert<ITodoAppAdminUser.IAuthorized>(firstAuthorized);

  const firstToken = firstAuthorized.token;
  typia.assert<IAuthorizationToken>(firstToken);

  // 3. Second refresh call to rotate tokens while preserving identity
  const secondAuthorized = await api.functional.auth.adminUser.refresh(
    connection,
    {
      body: refreshBody,
    },
  );
  typia.assert<ITodoAppAdminUser.IAuthorized>(secondAuthorized);

  const secondToken = secondAuthorized.token;
  typia.assert<IAuthorizationToken>(secondToken);

  // 4. Identity fields must be preserved across refresh operations
  TestValidator.equals(
    "admin id must remain stable across token refresh",
    secondAuthorized.id,
    firstAuthorized.id,
  );
  TestValidator.equals(
    "admin email must remain stable across token refresh",
    secondAuthorized.email,
    firstAuthorized.email,
  );
  TestValidator.equals(
    "admin display_name must remain stable across token refresh",
    secondAuthorized.display_name ?? null,
    firstAuthorized.display_name ?? null,
  );
  TestValidator.equals(
    "admin status must remain stable across token refresh",
    secondAuthorized.status,
    firstAuthorized.status,
  );
  TestValidator.equals(
    "admin created_at must remain stable across token refresh",
    secondAuthorized.created_at,
    firstAuthorized.created_at,
  );
  TestValidator.equals(
    "admin updated_at must remain stable across token refresh",
    secondAuthorized.updated_at,
    firstAuthorized.updated_at,
  );

  // 5. Token strings should rotate (change) on refresh
  TestValidator.notEquals(
    "access token must change after refresh",
    secondToken.access,
    firstToken.access,
  );
  TestValidator.notEquals(
    "refresh token must change after refresh",
    secondToken.refresh,
    firstToken.refresh,
  );

  // 6. Token expiry timestamps should move forward or at least change
  TestValidator.notEquals(
    "access token expired_at should change after refresh",
    secondToken.expired_at,
    firstToken.expired_at,
  );
  TestValidator.notEquals(
    "refresh token refreshable_until should change after refresh",
    secondToken.refreshable_until,
    firstToken.refreshable_until,
  );

  // 7. Ensure new expiry timestamps are not earlier than the old ones
  // Since timestamps are ISO8601 strings, lexical comparison matches chronological order
  TestValidator.predicate(
    "new access token expiry must not be earlier than previous expiry",
    secondToken.expired_at >= firstToken.expired_at,
  );
  TestValidator.predicate(
    "new refresh token lifetime must not be shorter than previous lifetime start",
    secondToken.refreshable_until >= firstToken.refreshable_until,
  );
}
