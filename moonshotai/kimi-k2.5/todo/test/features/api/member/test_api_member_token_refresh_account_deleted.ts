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

/**
 * Test token refresh failure when the member account has been deleted.
 *
 * 1. Register a member and obtain initial tokens
 * 2. Delete the member account
 * 3. Attempt to refresh tokens with the stale refresh token
 * 4. Verify 403 Forbidden is returned and no new tokens issued
 */
export async function test_api_member_token_refresh_account_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    },
  });
  typia.assert(authorized);
  // Capture refresh token before deletion
  const refreshToken = authorized.token.refresh;
  // 2. Delete member account using the authenticated connection
  await api.functional.multiUserTodo.member.account.erase(memberConnection);
  // 3. Attempt to refresh tokens with stale refresh token - should fail with 403
  await TestValidator.httpError(
    "refresh should fail with 403 for deleted member account",
    403,
    async () => {
      await api.functional.multiUserTodo.auth.member.refresh(
        { host: connection.host },
        {
          body: {
            refreshToken: refreshToken,
          } satisfies IMultiUserTodoMember.IRefresh,
        },
      );
    },
  );
}
