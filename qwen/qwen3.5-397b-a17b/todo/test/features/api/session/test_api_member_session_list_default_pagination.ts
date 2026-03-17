import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can retrieve their own active sessions with default pagination.
 *
 * This test verifies:
 * 1. Member can join and authenticate successfully
 * 2. Session list endpoint returns proper pagination metadata with default values
 * 3. Each session summary contains required fields (validated by typia.assert)
 * 4. Default pagination returns page 1 with default limit
 */
export async function test_api_member_session_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Retrieve sessions with default pagination (no filter parameters)
  const sessionList = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sessionList);
  // 3. Validate pagination metadata - default page should be 1
  TestValidator.equals("default page is 1", sessionList.pagination.current, 1);
  // 4. Validate pagination constraints
  TestValidator.predicate(
    "limit is positive",
    sessionList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    sessionList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    sessionList.pagination.pages >= 0,
  );
  // 5. Validate data array exists
  TestValidator.predicate("data array exists", Array.isArray(sessionList.data));
  // 6. Validate session count matches pagination records
  TestValidator.equals(
    "session count matches records",
    sessionList.data.length,
    sessionList.pagination.records,
  );
  // 7. Validate sessions are sorted by created_at descending (newest first)
  if (sessionList.data.length > 1) {
    for (let i = 0; i < sessionList.data.length - 1; i++) {
      const current = new Date(sessionList.data[i].created_at).getTime();
      const next = new Date(sessionList.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `session ${i} is newer than or equal to session ${i + 1}`,
        current >= next,
      );
    }
  }
}
