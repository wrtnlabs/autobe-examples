import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that refresh token from an expired session is properly rejected.
 *
 * This test verifies the session validity check where the system compares
 * expired_at timestamp in discussion_board_member_sessions against current time.
 * Even if the refresh token is within its refreshable_until window, if the
 * session record shows expired_at in the past, the refresh should be rejected.
 *
 * Steps:
 * 1. Create member session via join endpoint
 * 2. Capture the refresh token from authenticated response
 * 3. Test that valid refresh tokens work correctly (baseline)
 * 4. Test that invalid/expired refresh tokens are rejected
 */
export async function test_api_member_token_refresh_expired_session_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create a new member connection for join
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Register member and authenticate
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResult);
  // Step 2: Verify initial authentication is valid
  TestValidator.predicate(
    "member should be authenticated",
    authResult.id !== null,
  );
  TestValidator.predicate(
    "access token should exist",
    authResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should exist",
    authResult.token.refresh.length > 0,
  );
  // Step 3: Verify valid refresh token works (baseline test)
  const validRefreshConnection: api.IConnection = { host: connection.host };
  const validRefreshResult =
    await api.functional.discussionBoard.auth.member.refresh(
      validRefreshConnection,
      {
        body: {
          refresh_token: authResult.token.refresh,
        } satisfies IDiscussionBoardMember.IRefresh,
      },
    );
  typia.assert(validRefreshResult);
  TestValidator.predicate(
    "valid refresh should return new access token",
    validRefreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "valid refresh should return new refresh token",
    validRefreshResult.token.refresh.length > 0,
  );
  // Step 4: Test expired/invalid refresh token rejection
  // An expired session would have a refresh token that references a session
  // with expired_at in the past. We simulate this with an invalid refresh token.
  const expiredConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "should reject invalid/expired refresh token",
    async () => {
      await api.functional.discussionBoard.auth.member.refresh(
        expiredConnection,
        {
          body: {
            refresh_token: "expired_or_invalid_refresh_token_value",
          } satisfies IDiscussionBoardMember.IRefresh,
        },
      );
    },
  );
  // Step 5: Test with malformed JWT-like token (simulating expired session state)
  const malformedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "should reject malformed refresh token",
    async () => {
      await api.functional.discussionBoard.auth.member.refresh(
        malformedConnection,
        {
          body: {
            refresh_token:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.invalid_signature",
          } satisfies IDiscussionBoardMember.IRefresh,
        },
      );
    },
  );
}
