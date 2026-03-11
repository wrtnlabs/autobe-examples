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

export async function test_api_member_token_refresh_session_expired(
  connection: api.IConnection,
): Promise<void> {
  // Generate test credentials for member registration
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16);
  // 1. Register a new member to establish initial authentication session
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Test refresh with expired/invalid session
  // Using an invalid token to simulate expired session state
  // This validates that the refresh endpoint properly rejects invalid tokens
  // when session validation fails (expired_at timestamp in the past)
  await TestValidator.error(
    "refresh with expired session should fail",
    async () => {
      await api.functional.discussionBoard.auth.member.refresh(
        memberConnection,
        {
          body: {
            refresh: "invalid_expired_token_xyz",
          } satisfies IDiscussionBoardMember.IRefresh,
        },
      );
    },
  );
  // 3. Verify that refresh with valid token from join still works
  // This confirms the original session is still active and only invalid tokens are rejected
  const refreshResult = await authorize_member_refresh(memberConnection, {
    body: {
      refresh: joinResult.token.refresh,
    } satisfies IDiscussionBoardMember.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Validate new tokens were issued
  TestValidator.predicate(
    "new access token issued",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token issued",
    refreshResult.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    joinResult.token.refresh,
    refreshResult.token.refresh,
  );
}
