import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
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

export async function test_api_member_password_reset_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!" as string & tags.Format<"password">,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joined);
  const output = await api.functional.todoApp.member.password_resets.reset(
    memberConnection,
    {
      body: {
        token: typia.random<string>(),
        password: "NewPassword123!" as string & tags.Format<"password">,
      } satisfies ITodoAppMemberPasswordReset.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.equals("member id is a uuid identity", output.id, joined.id);
  TestValidator.equals("member email preserved", output.email, joined.email);
  TestValidator.equals(
    "created_at preserved",
    output.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "deleted_at preserved",
    output.deleted_at,
    joined.deleted_at,
  );
  TestValidator.predicate("profile exists", output.profile !== null);
  TestValidator.predicate("todos exists", Array.isArray(output.todos));
}
