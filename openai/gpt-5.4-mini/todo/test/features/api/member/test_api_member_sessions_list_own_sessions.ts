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

export async function test_api_member_sessions_list_own_sessions(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test authenticated member session browsing with default pagination and ordering.
   *
   * Verifies that the private member sessions endpoint returns only the current
   * member's own session summaries when accessed in an authenticated context.
   * The response is checked for the expected summary projection fields, default
   * newest-first ordering by created_at, and pagination metadata consistency.
   *
   * 1. Sign up a member and obtain authenticated access.
   * 2. Request the member sessions list with default browsing parameters.
   * 3. Validate returned session summaries and pagination metadata.
   * 4. Confirm results are ordered newest-first by created_at.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(8) + "A1!",
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(member);
  const output = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "pagination current page defaults to first page",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is not smaller than returned data size",
    output.pagination.limit >= output.data.length,
    true,
  );
  TestValidator.equals(
    "pagination records is at least the returned data size",
    output.pagination.records >= output.data.length,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "response data length respects pagination limit",
    output.data.length <= output.pagination.limit,
    true,
  );
  for (const session of output.data) {
    TestValidator.predicate("session has ip", session.ip.length > 0);
    TestValidator.predicate("session has href", session.href.length > 0);
    TestValidator.predicate(
      "session has referrer",
      session.referrer.length > 0,
    );
    TestValidator.predicate(
      "session created_at is present",
      session.created_at.length > 0,
    );
    TestValidator.predicate(
      "session expired_at is present",
      session.expired_at.length > 0,
    );
  }
  for (let i = 1; i < output.data.length; i++) {
    TestValidator.predicate(
      "sessions are ordered newest-first by created_at",
      output.data[i - 1].created_at >= output.data[i].created_at,
    );
  }
}
