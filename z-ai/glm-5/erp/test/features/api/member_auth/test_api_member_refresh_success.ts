import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful token refresh where a valid refresh token is used to obtain
 * new JWT access and refresh tokens.
 *
 * Workflow:
 * 1. Create a new member account via join operation and obtain initial tokens
 * 2. Extract the refresh token from the join response
 * 3. Call the refresh endpoint with the valid refresh token
 * 4. Verify token rotation (new refresh token differs from original)
 * 5. Verify member profile data consistency
 */
export async function test_api_member_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResponse);
  // 2. Store original token and member data for comparison
  const originalRefreshToken = joinResponse.token.refresh;
  const originalMemberId = joinResponse.id;
  const originalEmail = joinResponse.email;
  const originalDisplayName = joinResponse.display_name;
  // 3. Create a new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Call refresh endpoint with the valid refresh token
  const refreshResponse = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IErpHrmMember.IRefresh,
  });
  typia.assert(refreshResponse);
  // 5. Verify token rotation - new refresh token must differ from original
  TestValidator.notEquals(
    "refresh token rotation should generate new refresh token",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );
  // 6. Verify access token is non-empty
  TestValidator.predicate(
    "access token should be non-empty string",
    refreshResponse.token.access.length > 0,
  );
  // 7. Verify refresh token is non-empty
  TestValidator.predicate(
    "refresh token should be non-empty string",
    refreshResponse.token.refresh.length > 0,
  );
  // 8. Verify member profile data matches original
  TestValidator.equals(
    "member id should match original",
    refreshResponse.id,
    originalMemberId,
  );
  TestValidator.equals(
    "email should match original",
    refreshResponse.email,
    originalEmail,
  );
  TestValidator.equals(
    "display_name should match original",
    refreshResponse.display_name,
    originalDisplayName,
  );
  // 9. Verify expired_at is a valid future timestamp
  const expiredAt = new Date(refreshResponse.token.expired_at);
  TestValidator.predicate(
    "expired_at should be a valid date",
    !isNaN(expiredAt.getTime()),
  );
  // 10. Verify refreshable_until is a valid timestamp
  const refreshableUntil = new Date(refreshResponse.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until should be a valid date",
    !isNaN(refreshableUntil.getTime()),
  );
  // 11. Verify session expiration is after access token expiration
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
  // 12. Verify the new access token is set in connection header
  TestValidator.equals(
    "connection should have new access token in header",
    refreshConnection.headers?.Authorization,
    refreshResponse.token.access,
  );
}
