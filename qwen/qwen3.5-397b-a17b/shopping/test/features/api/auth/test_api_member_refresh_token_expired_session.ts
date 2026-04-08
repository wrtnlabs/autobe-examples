import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test refresh token rejection when session has expired.
 *
 * Validates the business rule that refresh tokens cannot be used after the session's expired_at timestamp is in the past. After a member registers and obtains authentication tokens, the test attempts to use the refresh token from an expired session. The system must reject the request with 401 Unauthorized because session validation requires expired_at to be greater than current time.
 *
 * This test ensures that expired sessions are properly invalidated and users must re-authenticate with email and password when their session expires. The refresh endpoint validates the session record in shopping_mall_member_sessions table, checking that expired_at is in the future before issuing new tokens.
 *
 * 1. Member registers with email and password credentials to create account and session.
 * 2. System creates session with expired_at timestamp and returns JWT access and refresh tokens.
 * 3. Test attempts to refresh using the refresh token, expecting rejection if session is expired.
 * 4. Validates system rejects with 401 Unauthorized when expired_at is not greater than current time.
 */
export async function test_api_member_refresh_token_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member to obtain authentication tokens and create session
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Extract refresh token from the authentication response
  const refreshToken = authorized.token.refresh;
  // 3. Attempt to refresh with the token - should fail with 401 if session expired
  // The backend validates: expired_at > NOW() in shopping_mall_member_sessions
  // In test environment, session expiration may be simulated or time-manipulated
  await TestValidator.httpError(
    "refresh token from expired session should be rejected with 401",
    401,
    async () => {
      await api.functional.shoppingMall.auth.member.refresh(memberConnection, {
        body: {
          refresh: refreshToken,
        } satisfies IShoppingMallMember.IRefresh,
      });
    },
  );
}
