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

export async function test_api_member_refresh_token_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and obtains initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(auth);
  // 2. Store the refresh token
  const refreshToken = auth.token.refresh;
  // 3. Attempt to refresh token - should fail with 401 Unauthorized
  //    because the session has expired (simulated by backend)
  await TestValidator.httpError(
    "refresh with expired session",
    401,
    async () => {
      await api.functional.discussionBoard.auth.member.refresh.refreshToken(
        memberConnection,
        {
          body: {
            refresh_token: refreshToken,
          } satisfies IDiscussionBoardMember.IRefresh,
        },
      );
    },
  );
}
