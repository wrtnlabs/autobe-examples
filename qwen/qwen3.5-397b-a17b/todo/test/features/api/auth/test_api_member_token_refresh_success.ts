import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member token refresh workflow to validate session continuity without re-authentication.
 *
 * Validates the complete token refresh flow including member registration, initial token acquisition, and token refresh operation. Ensures that the refresh endpoint correctly issues new tokens while maintaining member identity.
 *
 * Special attention is given to verifying that token rotation occurs (new access and refresh tokens are different from originals) and that member information remains consistent throughout the refresh process.
 *
 * 1. Register new member account with email, password, and display name.
 * 2. Capture initial access and refresh tokens from registration response.
 * 3. Call refresh endpoint with the captured refresh token.
 * 4. Validate new tokens are issued and member identity is preserved.
 */
export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and obtain initial tokens
  const joinResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Capture initial tokens
  const originalAccessToken = joinResult.token.access;
  const originalRefreshToken = joinResult.token.refresh;
  const memberId = joinResult.id;
  const memberEmail = joinResult.email;
  const memberDisplayName = joinResult.display_name;
  // 3. Create fresh connection for refresh call (token rotation test)
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await api.functional.todoApp.auth.member.refresh(
    refreshConnection,
    {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies ITodoAppMember.IRefresh,
    },
  );
  typia.assert(refreshResult);
  // 4. Validate token rotation occurred
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    refreshResult.token.refresh,
  );
  // 5. Validate member identity is preserved
  TestValidator.equals("member id preserved", memberId, refreshResult.id);
  TestValidator.equals("email preserved", memberEmail, refreshResult.email);
  TestValidator.equals(
    "display name preserved",
    memberDisplayName,
    refreshResult.display_name,
  );
  // 6. Validate account is active (not deleted)
  TestValidator.equals("account not deleted", refreshResult.deleted_at, null);
  // 7. Validate token expiration timestamps are set
  TestValidator.predicate("expired_at is future date", () => {
    return new Date(refreshResult.token.expired_at) > new Date();
  });
  TestValidator.predicate("refreshable_until is future date", () => {
    return new Date(refreshResult.token.refreshable_until) > new Date();
  });
  // 8. Validate refreshable_until is after expired_at
  TestValidator.predicate("refreshable_until after expired_at", () => {
    return (
      new Date(refreshResult.token.refreshable_until) >=
      new Date(refreshResult.token.expired_at)
    );
  });
}
