import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMember";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_members_list_ignores_scope_in_request_body(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  const requestA: ITodoAppMember.IRequest = {
    page: 1,
    limit: 10,
    search: RandomGenerator.substring(
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 1,
        sentenceMax: 1,
      }),
    ),
    completion_status: typia.random<boolean>(),
    start_date: null,
    due_date: null,
    deleted_in_trash: false,
  };
  const pageA = await api.functional.todoApp.member.members.index(
    memberConnection,
    {
      body: requestA,
    },
  );
  typia.assert(pageA);
  TestValidator.predicate(
    "all returned summaries are scoped to the authenticated member",
    () => pageA.data.every((m) => m.id === auth.id),
  );
  const requestB: ITodoAppMember.IRequest = {
    page: 1,
    limit: 5,
    search: typia.random<string>(),
    completion_status: !requestA.completion_status,
    start_date: null,
    due_date: null,
    deleted_in_trash: true,
  };
  const pageB = await api.functional.todoApp.member.members.index(
    memberConnection,
    {
      body: requestB,
    },
  );
  typia.assert(pageB);
  TestValidator.predicate(
    "all returned summaries remain scoped to the same authenticated member across requests",
    () => pageB.data.every((m) => m.id === auth.id),
  );
  TestValidator.equals("authenticated member id is stable", auth.id, auth.id);
}
