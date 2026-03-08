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
  // 1. Create member account and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {});
  typia.assert(initialAuth);
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  const memberId = initialAuth.id;
  // 2. Call refresh with the valid refresh token
  const refreshedAuth = await authorize_member_refresh(memberConnection, {
    body: {
      refreshToken: initialRefreshToken,
    } satisfies ICommunityPlatformMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Validate token rotation occurred - new tokens should be different
  TestValidator.notEquals(
    "access token rotated",
    refreshedAuth.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  // 4. Validate member information is correct and consistent
  TestValidator.equals("member id matches", refreshedAuth.id, memberId);
  TestValidator.equals(
    "username matches",
    refreshedAuth.username,
    initialAuth.username,
  );
  TestValidator.equals(
    "display name matches",
    refreshedAuth.displayName,
    initialAuth.displayName,
  );
  TestValidator.equals("bio matches", refreshedAuth.bio, initialAuth.bio);
  TestValidator.equals(
    "avatar url matches",
    refreshedAuth.avatarUrl,
    initialAuth.avatarUrl,
  );
  TestValidator.equals("karma matches", refreshedAuth.karma, initialAuth.karma);
}
