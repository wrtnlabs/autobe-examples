import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_session_list_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(memberConnection, {});
  // Call sessions.index to retrieve session list
  const response = await api.functional.todoApp.guest.sessions.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(response);
  // Verify pagination structure exists
  TestValidator.predicate("pagination exists", response.pagination !== null);
  TestValidator.predicate(
    "pagination.current is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Verify sessions data
  TestValidator.predicate("data is array", Array.isArray(response.data));
  TestValidator.predicate(
    "has at least one session",
    response.data.length >= 1,
  );
  // Verify sessions are ordered by created_at descending (most recent first)
  for (let i = 1; i < response.data.length; i++) {
    const prev = response.data[i - 1];
    const curr = response.data[i];
    TestValidator.predicate(
      "sessions ordered by created_at descending",
      new Date(prev.created_at).getTime() >=
        new Date(curr.created_at).getTime(),
    );
  }
}
