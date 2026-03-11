import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful token refresh scenario where a member uses a valid refresh
 * token to obtain new access tokens. The test validates that the refresh
 * operation generates new access and refresh tokens with updated expiration
 * timestamps, maintains the member's session continuity, and preserves all
 * member identity information.
 */
export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Create member account and obtain initial tokens
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    },
  });
  typia.assert(initialAuth);
  // 2. Extract refresh token from initial authorization
  const refreshBody = {
    refresh_token: initialAuth.token.refresh,
  } satisfies IMultiUserTodoMember.IRefresh;
  // 3. Call refresh endpoint using utility function
  const refreshedAuth = await authorize_member_refresh(memberConnection, {
    body: refreshBody,
  });
  typia.assert(refreshedAuth);
  // 4. Validate member identity continuity
  TestValidator.equals(
    "member ID should remain the same",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "member email should remain the same",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "member display name should remain the same",
    refreshedAuth.display_name,
    initialAuth.display_name,
  );
  // 5. Validate token rotation
  TestValidator.notEquals(
    "access token should be different after refresh",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different after refresh",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );
  // 6. Validate token structure and ordering
  TestValidator.predicate(
    "access token should not be empty",
    () => refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should not be empty",
    () => refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at should be valid ISO date-time",
    () => !isNaN(Date.parse(refreshedAuth.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until should be valid ISO date-time",
    () => !isNaN(Date.parse(refreshedAuth.token.refreshable_until)),
  );
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    () =>
      Date.parse(refreshedAuth.token.refreshable_until) >
      Date.parse(refreshedAuth.token.expired_at),
  );
}
