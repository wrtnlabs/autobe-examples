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
 * Test session list default sorting and pagination behavior.
 *
 * Validates that a registered member can retrieve their login sessions without specifying filters or pagination parameters. The system should return a paginated list of sessions sorted by creation time in descending order (newest first). Verifies pagination metadata (current page, limit, total records, total pages). Each session summary must contain id, ipAddress, href, referrer, createdAt, expiredAt, and computed isActive boolean.
 *
 * 1. Register a new member account with credentials. This creates the first session upon registration.
 * 2. Login multiple times with the same credentials to create additional sessions for testing default sorting behavior.
 * 3. Request the session list without any filters or pagination parameters to trigger default sorting (createdAt DESC).
 * 4. Verify the response includes correct pagination metadata matching the dataset.
 * 5. Validate each session summary contains all required fields with proper formats.
 * 6. Confirm sessions are sorted newest-first by comparing createdAt timestamps.
 */
export async function test_api_session_list_default_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member to establish initial session and authenticated context
  const memberConnection: api.IConnection = { host: connection.host };
  const joinCredentials: ITodoAppMember.IJoin = {
    display_name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    password: RandomGenerator.alphaNumeric(16),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  await authorize_member_join(memberConnection, { body: joinCredentials });
  // 2. Login with the same credentials multiple times to create additional sessions
  const loginCredentials: ITodoAppMember.ILogin = {
    email: joinCredentials.email,
    password: joinCredentials.password,
    href: joinCredentials.href,
    referrer: joinCredentials.referrer,
  };
  await authorize_member_login(memberConnection, { body: loginCredentials });
  const secondLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(secondLoginConnection, {
    body: loginCredentials,
  });
  const thirdLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(thirdLoginConnection, {
    body: loginCredentials,
  });
  // 3. Use the original member connection to request sessions without filters
  // This should return all sessions sorted by createdAt in descending order (newest first)
  const response = await api.functional.todoApp.sessions.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(response);
  // 4. Verify pagination metadata correctly reflects the dataset
  const pagination: IPage.IPagination = response.pagination;
  TestValidator.predicate(
    "pagination current page is at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records count matches data array length",
    pagination.records === response.data.length,
  );
  TestValidator.predicate(
    "pagination total pages is at least 1 when records exist",
    pagination.records > 0 ? pagination.pages >= 1 : pagination.pages === 0,
  );
  // 5. Verify session data fields are correctly populated
  TestValidator.predicate(
    "response contains at least one session",
    response.data.length >= 1,
  );
  if (response.data.length > 0) {
    const session: ITodoAppMemberSession.ISummary = response.data[0];
    TestValidator.predicate(
      "session id is a valid UUID",
      /^[0-9a-f-]{36}$/i.test(session.id),
    );
    TestValidator.predicate(
      "session ipAddress is not empty",
      session.ipAddress.length > 0,
    );
    TestValidator.predicate(
      "session href is a valid URI",
      session.href.length > 0,
    );
    TestValidator.predicate(
      "session createdAt is a valid date-time format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[.\d]*Z?$/i.test(session.createdAt),
    );
    TestValidator.predicate(
      "session expiredAt is a valid date-time format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[.\d]*Z?$/i.test(session.expiredAt),
    );
    TestValidator.predicate(
      "session isActive is a boolean type",
      typeof session.isActive === "boolean",
    );
    TestValidator.predicate(
      "session referrer is a valid URI or null",
      session.referrer === null || session.referrer.length > 0,
    );
  }
  // 6. Verify default sorting - sessions should be ordered by createdAt descending (newest first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentSession: ITodoAppMemberSession.ISummary = response.data[i];
      const nextSession: ITodoAppMemberSession.ISummary = response.data[i + 1];
      TestValidator.predicate(
        `session at index ${i} should be newer than or equal to session at index ${i + 1}`,
        new Date(currentSession.createdAt).getTime() >=
          new Date(nextSession.createdAt).getTime(),
      );
    }
  }
}
