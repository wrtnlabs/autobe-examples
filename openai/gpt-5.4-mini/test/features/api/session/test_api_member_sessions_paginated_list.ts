import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_member_sessions_paginated_list(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.todoApp.auth.member.join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: true,
    } satisfies ITodoAppMember.IJoin,
  });
  const output = await api.functional.todoApp.guest.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.predicate(
    "pagination metadata is present",
    output.pagination.current >= 1 &&
      output.pagination.limit >= 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "session summaries expose only safe fields",
    output.data.every(
      (item) =>
        item.id.length > 0 &&
        item.ip.length > 0 &&
        item.href.length > 0 &&
        item.referrer.length > 0 &&
        item.created_at.length > 0 &&
        item.expired_at.length > 0,
    ),
  );
  const emptyMemberConnection: api.IConnection = { host: connection.host };
  await api.functional.todoApp.auth.member.join(emptyMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: false,
    } satisfies ITodoAppMember.IJoin,
  });
  const emptyOutput = await api.functional.todoApp.guest.sessions.index(
    emptyMemberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(emptyOutput);
  TestValidator.equals("empty session list", emptyOutput.data.length, 0);
  TestValidator.predicate(
    "empty pagination metadata is valid",
    emptyOutput.pagination.current >= 1 &&
      emptyOutput.pagination.limit >= 0 &&
      emptyOutput.pagination.records >= 0 &&
      emptyOutput.pagination.pages >= 0,
  );
}
