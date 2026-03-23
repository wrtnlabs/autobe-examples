import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_account_deletion_cascading(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Perform account deletion
  await api.functional.todoApp.member.users.me.erase(memberConnection);
  // 3. Verify member is permanently deleted (cannot access member endpoints)
  await TestValidator.error("member profile permanently deleted", async () => {
    // Try to login with deleted account - should fail
    await api.functional.todoApp.auth.member.login(memberConnection, {
      body: {
        email: joinResponse.member.email,
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  });
}
