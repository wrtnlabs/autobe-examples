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

export async function test_api_member_refresh_session_extension(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account to get a valid refresh token
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {} satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Use the refresh token from response to refresh session
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedMember = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: member.token
        .refresh satisfies ICommunityPlatformMember.IRefresh["refreshToken"],
    } satisfies ICommunityPlatformMember.IRefresh,
  });
  typia.assert(refreshedMember);
  // 3. Validate tokens have been refreshed
  TestValidator.notEquals(
    "access token changed",
    member.token.access,
    refreshedMember.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed",
    member.token.refresh,
    refreshedMember.token.refresh,
  );
}
