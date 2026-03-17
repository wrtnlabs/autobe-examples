import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_token_refresh_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account to obtain valid refresh token
  const originalPassword: string = RandomGenerator.alphaNumeric(16);
  const testHref: string = typia.random<string & tags.Format<"uri">>();
  const testReferrer: string = typia.random<string & tags.Format<"uri">>();
  const joinConnection: api.IConnection = { host: connection.host };
  const joinOutput: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<
          string &
            tags.MinLength<1> &
            tags.MaxLength<255> &
            tags.Format<"email">
        >(),
        password: originalPassword,
        username: RandomGenerator.name(1),
        href: testHref,
        referrer: testReferrer,
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(joinOutput);
  // 2. Extract the refresh token from the initial authentication
  const refreshToken: string = joinOutput.token.refresh;
  // 3. Verify that valid refresh token works (baseline test)
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshOutput: IRedditPlatformMember.IAuthorized =
    await authorize_member_refresh(refreshConnection, {
      body: {
        refresh: refreshToken,
      } satisfies IRedditPlatformMember.IRefresh,
    });
  typia.assert(refreshOutput);
  // 4. Test with an expired/invalid refresh token
  // Since we cannot directly manipulate session expiration in E2E without database access,
  // we test with a deliberately malformed token to verify the system properly rejects
  // invalid tokens with 401 Unauthorized error
  const invalidRefreshToken: string = "invalid_expired_refresh_token_12345";
  // 5. Attempt to refresh with invalid token - should throw HttpError with 401
  await TestValidator.httpError(
    "expired session refresh should return 401",
    401,
    async () => {
      await api.functional.redditPlatform.auth.member.refresh(connection, {
        body: {
          refresh: invalidRefreshToken,
        } satisfies IRedditPlatformMember.IRefresh,
      });
    },
  );
  // 6. Verify that member can still authenticate through login after failed refresh
  // This confirms the system requires re-authentication when refresh fails
  const loginConnection: api.IConnection = { host: connection.host };
  const loginOutput: IRedditPlatformMember.IAuthorized =
    await api.functional.redditPlatform.auth.member.login(loginConnection, {
      body: {
        email: joinOutput.email,
        password: originalPassword,
        href: testHref,
        referrer: testReferrer,
      },
    });
  typia.assert(loginOutput);
  // 7. Verify the login response contains valid tokens
  TestValidator.predicate(
    "login response contains access token",
    loginOutput.token.access.length > 0,
  );
  TestValidator.predicate(
    "login response contains refresh token",
    loginOutput.token.refresh.length > 0,
  );
}
