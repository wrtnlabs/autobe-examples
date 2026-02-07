import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful token refresh for a valid member session.
 * 1. Member registers and logs in to establish active session
 * 2. Member uses refresh token to obtain new tokens
 * 3. Verify new tokens are properly generated and returned
 */
export async function test_api_member_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and establish session
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.member.join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // Step 2: Login to establish active session with refresh token
  const loginResponse = await api.functional.discussionBoard.auth.member.login(
    memberConnection,
    {
      body: typia.random<IDiscussionBoardMember.ILogin>(),
    },
  );
  typia.assert(loginResponse);
  // Step 3: Refresh tokens using valid refresh token
  const refreshResponse =
    await api.functional.discussionBoard.auth.member.refresh(memberConnection, {
      body: {
        refresh: loginResponse.token.refresh,
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  typia.assert(refreshResponse);
}
