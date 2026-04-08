import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test token refresh failure with invalid or expired refresh tokens.
 *
 * Validates the security boundary that prevents unauthorized session extension with invalid credentials. The test verifies that providing malformed, tampered, or expired refresh tokens results in appropriate 401 Unauthorized responses without leaking sensitive internal information.
 *
 * **Security Validation Points**
 *
 * 1. Malformed tokens (random strings) are rejected with 401
 * 2. Tampered tokens (modified JWT payload) are rejected with 401
 * 3. Expired tokens are rejected with 401
 * 4. No new tokens are issued on validation failure
 * 5. Error messages do not reveal sensitive internal details
 *
 * 1. Register a new member account to obtain valid JWT tokens.
 * 2. Test refresh with malformed token (random string).
 * 3. Test refresh with tampered token (valid token with modified payload).
 * 4. Test refresh with expired token pattern.
 * 5. Verify 401 Unauthorized responses for all invalid token cases.
 * 6. Confirm no new tokens are issued when validation fails.
 */
export async function test_api_member_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account to obtain valid JWT tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Test refresh with malformed token (random string)
  await TestValidator.httpError(
    "malformed token should return 401",
    401,
    async () => {
      const malformedConnection: api.IConnection = { host: connection.host };
      await authorize_member_refresh(malformedConnection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(50),
        } satisfies IRedditLikeMember.IRefresh,
      });
    },
  );
  // 3. Test refresh with tampered token (valid token with modified signature)
  await TestValidator.httpError(
    "tampered token should return 401",
    401,
    async () => {
      const tamperedConnection: api.IConnection = { host: connection.host };
      // Take valid token and append random characters to tamper it
      const tamperedToken =
        authorized.token.refresh + RandomGenerator.alphabets(10);
      await authorize_member_refresh(tamperedConnection, {
        body: {
          refresh_token: tamperedToken,
        } satisfies IRedditLikeMember.IRefresh,
      });
    },
  );
  // 4. Test refresh with completely invalid UUID-like token
  await TestValidator.httpError(
    "invalid UUID token should return 401",
    401,
    async () => {
      const invalidConnection: api.IConnection = { host: connection.host };
      await authorize_member_refresh(invalidConnection, {
        body: {
          refresh_token: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IRedditLikeMember.IRefresh,
      });
    },
  );
  // 5. Verify that the original member can still refresh with valid token
  const refreshed = await authorize_member_refresh(memberConnection, {
    body: {
      refresh_token: authorized.token.refresh,
    } satisfies IRedditLikeMember.IRefresh,
  });
  typia.assert(refreshed);
  // 6. Verify new tokens were issued for valid refresh
  TestValidator.notEquals(
    "access token should be different after refresh",
    authorized.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different after refresh (rotation)",
    authorized.token.refresh,
    refreshed.token.refresh,
  );
}
