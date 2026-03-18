import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_invalid_refresh_rejected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  // 1) Join a member and obtain a refreshToken
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.pick([true, false]),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(joined);
  // 2) Corrupt the refresh credential so it no longer maps to an active session.
  // (No session-table mutation utility is available in this test environment.)
  const invalidRefreshPayload: IMultiUserTodoMember.IRefresh = {
    refreshToken: `${joined.token.refresh}.${RandomGenerator.alphabets(16)}`,
  };
  // 3) Attempt refresh with the invalid refreshToken (should be rejected)
  await TestValidator.error(
    "member refresh should reject invalid/unknown refresh token",
    async () => {
      await authorize_member_refresh(
        { host: connection.host },
        {
          body: invalidRefreshPayload,
        },
      );
    },
  );
  // 5) Ensure subsequent attempts with the same invalid token still fail
  await TestValidator.error(
    "member refresh should consistently reject the same invalid refresh token",
    async () => {
      await authorize_member_refresh(
        { host: connection.host },
        {
          body: invalidRefreshPayload,
        },
      );
    },
  );
}
