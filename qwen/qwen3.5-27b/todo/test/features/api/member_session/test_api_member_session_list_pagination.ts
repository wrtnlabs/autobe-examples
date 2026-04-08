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
 * Test that an authenticated member can retrieve their session history with pagination.
 *
 * Validates the complete member session listing flow including member registration, session creation, and paginated retrieval. Ensures that the response includes proper pagination metadata and session summary fields with correct types and values.
 *
 * Special attention is given to verifying that the pagination structure contains all required fields (current, limit, records, pages) and that each session summary includes essential information like session ID, IP address, login URL, referrer, timestamps, and active status.
 *
 * 1. Member registers with email and password credentials, creating their first session.
 * 2. Member calls the sessions endpoint without filters to retrieve all their sessions.
 * 3. Validates pagination metadata is present and correctly structured.
 * 4. Validates each session summary contains required fields with correct types.
 * 5. Verifies at least one session exists from the registration operation.
 */
export async function test_api_member_session_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Retrieve session list with pagination
  const sessions = await api.functional.todoApp.member.member.sessions.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sessions);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    sessions.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has positive limit",
    sessions.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has total records",
    sessions.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination has total pages",
    sessions.pagination.pages >= 1,
  );
  // 4. Validate at least one session exists
  TestValidator.predicate(
    "at least one session exists",
    sessions.data.length >= 1,
  );
  // 5. Validate each session summary
  await ArrayUtil.asyncForEach(sessions.data, async (session, index) => {
    typia.assert(session);
    TestValidator.predicate(
      `session ${index} has valid UUID id`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.predicate(
      `session ${index} has IP address`,
      session.ip.length > 0,
    );
    TestValidator.predicate(
      `session ${index} has href URL`,
      session.href.length > 0,
    );
    TestValidator.predicate(
      `session ${index} has created_at timestamp`,
      session.created_at.length > 0,
    );
    TestValidator.predicate(
      `session ${index} has expired_at timestamp`,
      session.expired_at.length > 0,
    );
    TestValidator.predicate(
      `session ${index} has is_active boolean`,
      typeof session.is_active === "boolean",
    );
  });
  // 6. Verify default sorting (newest first by created_at)
  if (sessions.data.length >= 2) {
    const firstSession = sessions.data[0];
    const lastSession = sessions.data[sessions.data.length - 1];
    TestValidator.predicate(
      "sessions sorted by created_at descending",
      new Date(firstSession.created_at).getTime() >=
        new Date(lastSession.created_at).getTime(),
    );
  }
}
