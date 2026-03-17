import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  typia.assert(initialAuth);
  // Store initial tokens for comparison
  const initialAccessToken: string = initialAuth.token.access;
  const initialRefreshToken: string = initialAuth.token.refresh;
  // 2. Call refresh endpoint with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_refresh(refreshConnection, {
      body: {
        refreshToken: initialRefreshToken,
      } satisfies ICommunityPlatformMember.IRefresh,
    });
  typia.assert(refreshedAuth);
  // 3. Validate token rotation - new tokens should be different
  TestValidator.notEquals(
    "access token should be rotated",
    refreshedAuth.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  // 4. Validate member profile consistency
  TestValidator.equals(
    "member id should match initial registration",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "username should match initial registration",
    refreshedAuth.username,
    initialAuth.username,
  );
  // 5. Validate karma is 0 for newly created member (business rule)
  TestValidator.equals(
    "karma should be 0 for new member",
    refreshedAuth.karma,
    0,
  );
}
