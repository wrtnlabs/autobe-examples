import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful refresh token renewal with valid credentials.
 *
 * Validates that a member who has already joined the system can renew their authentication tokens by providing a valid refresh token. The system should validate the refresh token, verify the session is active, implement token rotation by invalidating the old token and generating a new pair, and return new access and refresh tokens in the IAuthorized response.
 *
 * 1. Create member account with email/password to obtain initial refresh token
 * 2. Call refresh endpoint with the refresh token
 * 3. Validate new tokens are returned with different values
 * 4. Validate old refresh token is invalidated and cannot be reused
 */
export async function test_api_member_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account to obtain initial refresh token
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(joinResult);
  // Store old refresh token
  const oldRefreshToken = joinResult.token.refresh;
  const oldAccessToken = joinResult.token.access;
  // 2. Refresh token with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: oldRefreshToken,
    } satisfies IHrmMember.IRefresh,
  });
  typia.assert(refreshResult);
  // 3. Validate new tokens are different from old ones (token rotation)
  TestValidator.notEquals(
    "access token changed",
    oldAccessToken,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed (rotation)",
    oldRefreshToken,
    refreshResult.token.refresh,
  );
  // 4. Validate old refresh token is invalidated and cannot be reused
  await TestValidator.httpError(
    "old refresh token invalidated",
    401,
    async () => {
      await authorize_member_refresh(refreshConnection, {
        body: {
          refresh_token: oldRefreshToken,
        } satisfies IHrmMember.IRefresh,
      });
    },
  );
}
