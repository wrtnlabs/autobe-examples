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
 * Test that deleted member accounts cannot login.
 *
 * 1. Create a member account via join endpoint
 * 2. Delete the account using account deletion endpoint
 * 3. Attempt to login with deleted credentials
 * 4. Verify login is rejected with HTTP error (403 Forbidden for deleted accounts)
 */
export async function test_api_member_login_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique credentials for the test
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 1. Create a member using the join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: email satisfies string as string,
      password: password satisfies string as string,
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    },
  });
  typia.assert(authorized);
  // 2. Delete the member account
  await api.functional.multiUserTodo.member.account.erase(memberConnection);
  // 3. Attempt login with deleted account credentials - should fail with 403 Forbidden
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "deleted account login should be rejected with 403",
    403,
    async () => {
      await authorize_member_login(loginConnection, {
        body: {
          email: email satisfies string as string,
          password: password satisfies string as string,
        } satisfies IMultiUserTodoMember.ILogin,
      });
    },
  );
}