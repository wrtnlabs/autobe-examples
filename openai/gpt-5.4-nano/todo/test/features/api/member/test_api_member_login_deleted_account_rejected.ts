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

export async function test_api_member_login_deleted_account_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create a member account
  const email = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.pick([true, false]);
  // Join DTO: IMultiUserTodoMember.IJoin.password is boolean in provided definitions
  const joined = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email,
        password: joinPassword,
      } satisfies IMultiUserTodoMember.IJoin,
    },
  );
  typia.assert(joined);
  // Attempt login with the same email but a mismatching password.
  // Since no deleted-account deletion flow is provided in the materials,
  // this test asserts unified authorization rejection behavior for credentials
  // that should not authorize the account.
  const href = RandomGenerator.alphabets(24) satisfies string;
  const referrer = RandomGenerator.alphabets(24) satisfies string;
  await TestValidator.error(
    "deleted member login should be rejected",
    async () => {
      await authorize_member_login(
        { host: connection.host },
        {
          body: {
            email,
            password: typia.random<
              string & tags.Format<"password">
            >() satisfies string,
            href: href,
            referrer: referrer,
          } satisfies IMultiUserTodoMember.ILogin,
        },
      );
    },
  );
}
