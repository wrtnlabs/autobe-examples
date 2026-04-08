import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the edge case where a member attempts to refresh tokens with an expired or invalid refresh token.
 *
 * Validates that the authentication system properly rejects refresh attempts when the refresh token is invalid or expired. Since E2E tests cannot manipulate session expiration in the database, we test the error handling path by providing an invalid token, which simulates the behavior of an expired session from the client's perspective.
 *
 * The test verifies that:
 * 1. A valid refresh token successfully obtains new authentication credentials
 * 2. An invalid or malformed refresh token is rejected with appropriate HTTP error status
 *
 * 1. Register a new member account using authorize_member_join utility
 * 2. Extract the refresh token from the join response
 * 3. Successfully refresh tokens with the valid refresh token
 * 4. Attempt to refresh with an invalid token (simulating expired session)
 * 5. Verify the invalid refresh attempt throws HTTP error (401 or 403)
 */
export async function test_api_member_refresh_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  typia.assert(member);
  // 2. Extract the refresh token from the join response
  const validRefreshToken = member.token.refresh;
  // 3. Successfully refresh tokens with the valid refresh token
  const refreshedMember = await authorize_member_refresh(memberConnection, {
    body: {
      refresh_token: validRefreshToken,
    } satisfies IHrmTimeTrackMember.IRefresh,
  });
  typia.assert(refreshedMember);
  // Verify that the refresh was successful and new tokens were issued
  TestValidator.equals("member ID matches", refreshedMember.id, member.id);
  TestValidator.equals("email matches", refreshedMember.email, member.email);
  TestValidator.notEquals(
    "refresh token should be rotated",
    refreshedMember.token.refresh,
    validRefreshToken,
  );
  // 4. Attempt to refresh with an invalid token (simulating expired session)
  const invalidConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "invalid refresh token should be rejected",
    [401, 403],
    async () =>
      await authorize_member_refresh(invalidConnection, {
        body: {
          refresh_token: "invalid_token_simulating_expired_session",
        } satisfies IHrmTimeTrackMember.IRefresh,
      }),
  );
}
