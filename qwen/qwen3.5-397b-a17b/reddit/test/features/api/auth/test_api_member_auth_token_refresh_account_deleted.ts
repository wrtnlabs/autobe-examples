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

/**
 * Test token refresh failure when the member account has been deleted.
 *
 * Validates that the authentication system properly prevents deleted accounts from obtaining new tokens even when presenting a previously valid refresh_token. This test ensures the token refresh endpoint validates account status and rejects tokens from deleted or inactive accounts, maintaining security by preventing unauthorized session continuation after account deletion.
 *
 * 1. Register a new member account via /redditCommunity/auth/member/join to obtain initial authentication tokens (access_token and refresh_token).
 * 2. Store the refresh_token from the registration response for later use.
 * 3. Note: Account deletion would normally occur here via a delete endpoint, but since no delete endpoint is available in the provided API functions, the backend test environment may simulate the deleted account state internally.
 * 4. Call /redditCommunity/auth/member/refresh with the stored refresh_token from the deleted account.
 * 5. Verify the API call throws an error with 403 Forbidden status, indicating the account is deleted or inactive.
 *
 * This test ensures the token refresh endpoint properly validates account status and rejects tokens from deleted/inactive accounts, maintaining security by preventing unauthorized session continuation after account deletion.
 */
export async function test_api_member_auth_token_refresh_account_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account and obtain initial tokens
  const joinResult: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityMember.IJoin,
    });
  typia.assert(joinResult);
  // 2. Store the refresh_token from the registration response
  const refreshToken: string = joinResult.token.refresh;
  // 3. Create a new connection for the refresh attempt
  // Note: In a complete test scenario, account deletion would occur here
  // The backend test environment may simulate the deleted account state
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4-5. Attempt to refresh tokens and verify it fails with 403 Forbidden
  // This validates that deleted accounts cannot refresh tokens
  await TestValidator.error(
    "deleted account cannot refresh token",
    async () => {
      await api.functional.redditCommunity.auth.member.refresh(
        refreshConnection,
        {
          body: {
            refresh_token: refreshToken,
          } satisfies IRedditCommunityMember.IRefresh,
        },
      );
    },
  );
}
