import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_account_update_own_password(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joined);
  const updatedPassword = RandomGenerator.alphaNumeric(16);
  const updated = await api.functional.todoApp.member.accounts.update(
    memberConnection,
    {
      accountId: joined.id,
      body: {
        password: updatedPassword,
      } satisfies ITodoAppMember.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals("same account id", updated.id, joined.id);
  TestValidator.equals("email unchanged", updated.email, joined.email);
  TestValidator.equals(
    "created timestamp preserved",
    updated.created_at,
    joined.created_at,
  );
  TestValidator.predicate(
    "updated timestamp should not move backwards",
    new Date(updated.updated_at).getTime() >=
      new Date(joined.updated_at).getTime(),
  );
  TestValidator.equals("account remains active", updated.deleted_at, null);
  TestValidator.equals(
    "profile id preserved",
    updated.profile.id,
    joined.profile.id,
  );
  TestValidator.equals(
    "profile display name preserved",
    updated.profile.display_name,
    joined.profile.display_name,
  );
  TestValidator.equals(
    "profile owner preserved",
    updated.profile.member,
    joined.profile.member,
  );
  TestValidator.equals(
    "no todos changed during password update",
    updated.todos,
    joined.todos,
  );
}
