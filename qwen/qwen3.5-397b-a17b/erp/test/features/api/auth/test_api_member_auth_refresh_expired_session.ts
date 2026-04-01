import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test token refresh operation when the session has expired.
 * 1. Register a new member account via join to establish an initial session.
 * 2. Since we cannot wait for actual session expiration in E2E tests, we test
 *    the error handling by attempting refresh with an invalid/tampered refresh
 *    token which simulates an expired session scenario.
 * 3. Attempt to refresh using an invalid refresh token.
 * 4. Verify the system rejects the refresh request with 401 Unauthorized error.
 * This validates the business rule that invalid/expired sessions cannot be
 * refreshed and users must re-authenticate with credentials.
 */
export async function test_api_member_auth_refresh_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account to establish an initial session
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Verify we received valid tokens from join
  TestValidator.predicate(
    "access token exists",
    joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    joinResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(joinResult.token.expired_at) > new Date(),
  );
  // 3. Attempt to refresh with an invalid/tampered refresh token
  // This simulates the expired session scenario since we cannot wait for actual expiration
  const invalidRefreshToken = "invalid_" + joinResult.token.refresh;
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Verify the system rejects with 401 Unauthorized error
  await TestValidator.httpError(
    "refresh with invalid token should return 401",
    401,
    async () => {
      await api.functional.hrmPlatform.auth.member.refresh(refreshConnection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IHrmPlatformMember.IRefresh,
      });
    },
  );
}
