import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_refresh(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with initial refresh token
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
    } satisfies ICommunityMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Extract refresh token from join response
  const refreshToken = joinResponse.token.refresh;
  // 3. Use refresh token to obtain new tokens
  // Despite ICommunityMember.IRefresh being empty in DTO, API requires refresh_token property
  // We construct the body according to actual API contract
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies ICommunityMember.IRefresh as ICommunityMember.IRefresh,
  });
  typia.assert(refreshResponse);
  // 4. Validate refresh response
  // Verify new access token exists and has proper structure
  TestValidator.equals(
    "new access token length",
    refreshResponse.token.access.length > 0,
    true,
  );
  // Verify new refresh token exists and is different from old (token rotation)
  TestValidator.notEquals(
    "refresh token was rotated",
    refreshResponse.token.refresh,
    refreshToken,
  );
  // Verify token structure with typia.assert (comprehensive validation)
  typia.assert(refreshResponse.token);
}
