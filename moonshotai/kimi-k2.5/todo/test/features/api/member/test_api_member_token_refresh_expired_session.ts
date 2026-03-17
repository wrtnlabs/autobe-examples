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
 * Test token refresh failure when using an expired refresh token.
 * First, register a member and obtain tokens. The refresh token is invalidated
 * after first use due to token rotation. Attempting to refresh with the old
 * invalidated token should return 401 Unauthorized, requiring a new login.
 */
export async function test_api_member_token_refresh_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    },
  });
  typia.assert(initialAuth);
  const oldRefreshToken = initialAuth.token.refresh;
  // Step 2: Perform a successful refresh - this invalidates the old token due to rotation
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: oldRefreshToken,
    } satisfies IMultiUserTodoMember.IRefresh,
  });
  typia.assert(refreshedAuth);
  TestValidator.predicate(
    "new refresh token should be different from old token",
    () => refreshedAuth.token.refresh !== oldRefreshToken,
  );
  // Step 3: Attempt to refresh with the old (now expired/invalidated) token
  // This should fail with 401 Unauthorized
  await TestValidator.httpError(
    "expired refresh token should return 401",
    401,
    async () => {
      await api.functional.multiUserTodo.auth.member.refresh(
        { host: connection.host },
        {
          body: {
            refreshToken: oldRefreshToken,
          } satisfies IMultiUserTodoMember.IRefresh,
        },
      );
    },
  );
}
