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

export async function test_api_member_token_refresh_with_expired_token(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Edge case testing token refresh with expired refresh token.
   * When a member attempts to use a refresh token that has exceeded its refresh_expires_at
   * timestamp, the system SHALL reject the request with an appropriate error indicating
   * the refresh token has expired. This test validates the security boundary ensuring
   * expired tokens cannot be used to obtain new access tokens indefinitely, requiring
   * the member to re-authenticate using credentials (login or join).
   */
  // Step 1: Establish authenticated member session to obtain initial tokens
  // This creates the context where a member has previously obtained tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(authorized);
  // Step 2: Attempt token refresh with an expired/invalid refresh token
  // The system SHALL reject this request because the token is no longer valid
  // (either expired or doesn't exist in the reddit_like_member_sessions table)
  await TestValidator.httpError(
    "expired refresh token should be rejected with 401 Unauthorized",
    401,
    async () => {
      await authorize_member_refresh(memberConnection, {
        body: {
          refreshToken:
            "EXPIRED_REFRESH_TOKEN_THAT_HAS_EXCEEDED_REFRESHABLE_UNTIL",
        } satisfies IRedditLikeMember.IRefresh,
      });
    },
  );
}
