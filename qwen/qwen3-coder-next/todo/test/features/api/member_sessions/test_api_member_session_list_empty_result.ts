import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestSession";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_list_empty_result(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    } satisfies ITodoAppMemberSession.IJoin,
  });
  const sessionList =
    await api.functional.todoApp.member.sessions.index(memberConnection);
  typia.assert(sessionList);
  TestValidator.predicate("has pagination", sessionList.pagination !== null);
  TestValidator.predicate("has data array", Array.isArray(sessionList.data));
  TestValidator.predicate(
    "total is non-negative",
    sessionList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    sessionList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "current page is positive",
    sessionList.pagination.current > 0,
  );
  if (sessionList.pagination.records === 0) {
    TestValidator.equals(
      "pages is zero when no records",
      sessionList.pagination.pages,
      0,
    );
    TestValidator.predicate(
      "data array is empty",
      sessionList.data.length === 0,
    );
  } else {
    TestValidator.predicate(
      "pages calculation is correct",
      sessionList.pagination.pages > 0,
    );
  }
}
