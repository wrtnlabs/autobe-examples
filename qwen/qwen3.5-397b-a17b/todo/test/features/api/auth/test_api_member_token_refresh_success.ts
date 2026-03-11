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
 * Test member token refresh success workflow.
 *
 * This test validates the complete token refresh flow:
 * 1. Register a new member account to obtain initial tokens
 * 2. Extract the refresh token from the registration response
 * 3. Call the refresh endpoint with the refresh token
 * 4. Verify the new tokens are properly structured
 * 5. Validate member identity information is preserved
 * 6. Confirm token rotation (new tokens differ from old)
 */
export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member to obtain initial tokens
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
  // 2. Extract refresh token from join response
  const refreshToken = joinResult.token.refresh;
  // 3. Call refresh endpoint with the refresh token
  const refreshResult = await authorize_member_refresh(connection, {
    body: {
      refresh: refreshToken,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Validate member identity is preserved after refresh
  TestValidator.equals("member id preserved", joinResult.id, refreshResult.id);
  TestValidator.equals(
    "email preserved",
    joinResult.email,
    refreshResult.email,
  );
  TestValidator.equals(
    "display name preserved",
    joinResult.display_name,
    refreshResult.display_name,
  );
  // 5. Validate token rotation - new tokens differ from old tokens
  TestValidator.notEquals(
    "new access token",
    joinResult.token.access,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token",
    joinResult.token.refresh,
    refreshResult.token.refresh,
  );
  // 6. Validate expiration timestamps are properly set
  TestValidator.predicate(
    "expired_at is set",
    refreshResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is set",
    refreshResult.token.refreshable_until.length > 0,
  );
  // 7. Validate refreshable_until is after expired_at (session can be extended)
  const expiredAt = new Date(refreshResult.token.expired_at);
  const refreshableUntil = new Date(refreshResult.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until after expired_at",
    refreshableUntil > expiredAt,
  );
}
