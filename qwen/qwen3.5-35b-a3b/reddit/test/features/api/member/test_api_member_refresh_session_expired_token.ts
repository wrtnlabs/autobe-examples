import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_session_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and obtain tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Store the refresh token
  const refreshToken: string = joinResponse.token.refresh;
  // 3. First refresh to get fresh tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const freshRefreshResponse = await authorize_member_refresh(
    refreshConnection,
    {
      body: {
        refreshToken: refreshToken,
      } satisfies IRedditCommunityMember.IRefresh,
    },
  );
  typia.assert(freshRefreshResponse);
  // 4. Store the new refresh token
  const freshRefreshToken: string = freshRefreshResponse.token.refresh;
  // 5. Create an invalid/expired refresh token to test error handling
  // Since we cannot directly manipulate the database, we create an invalid token
  const expiredRefreshToken: string = "invalid_expired_token_for_testing";
  // 6. Attempt to refresh with expired/invalid token
  // This should fail with an authentication error
  const errorConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "expired token should fail with authentication error",
    async () => {
      await authorize_member_refresh(errorConnection, {
        body: {
          refreshToken: expiredRefreshToken,
        } satisfies IRedditCommunityMember.IRefresh,
      });
    },
  );
}
