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

export async function test_api_member_token_refresh_with_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // Create a member account to establish valid authentication context
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // Verify the member was created successfully
  typia.assert(authorized);
  // Attempt to refresh using a fabricated/invalid refresh token
  // This should be rejected with 401 Unauthorized
  const invalidRefreshToken = `invalid.fabricated.token.${RandomGenerator.alphaNumeric(32)}`;
  await TestValidator.httpError(
    "should reject invalid refresh token with 401",
    401,
    async () => {
      const freshConnection: api.IConnection = { host: connection.host };
      await api.functional.multiUserTodo.auth.member.refresh(freshConnection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IMultiUserTodoMember.IRefresh,
      });
    },
  );
}
