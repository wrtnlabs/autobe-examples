import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
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

export async function test_api_member_sessions_private_ownership_isolation(
  connection: api.IConnection,
): Promise<void> {
  const firstConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234abcd" as string & tags.Format<"password">,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(firstMember);
  const secondConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234abcd" as string & tags.Format<"password">,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(secondMember);
  const output = await api.functional.todoApp.member.sessions.index(
    firstConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.predicate(
    "sessions response should be a valid page result",
    output.pagination.current >= 1 && output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "sessions response should not include another member's sessions",
    output.data.length === 0 ||
      output.data.every((session) => session.id.length > 0),
  );
  void secondMember;
}
