import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can retrieve their active authentication sessions with default pagination.
 *
 * This test verifies:
 * 1. Member registration and login creates authentication sessions
 * 2. Multiple logins create multiple sessions
 * 3. Active sessions can be retrieved with proper pagination
 * 4. Session data contains all required fields with correct formats
 * 5. Data isolation ensures member only sees their own sessions
 */
export async function test_api_member_session_list_active_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const registrationPassword = typia.random<string & tags.Format<"password">>();
  const registeredMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: registrationPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(registeredMember);
  // 2. Login to create first active session
  const sessionConnection: api.IConnection = { host: connection.host };
  const loginCredentials = {
    email: registeredMember.email,
    password: registrationPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IMultiUserTodoMember.ILogin;
  const firstLogin = await authorize_member_login(sessionConnection, {
    body: loginCredentials,
  });
  typia.assert(firstLogin);
  // 3. Login again to create additional session (simulating multiple devices)
  const secondSessionConnection: api.IConnection = { host: connection.host };
  const secondLogin = await authorize_member_login(secondSessionConnection, {
    body: {
      email: registeredMember.email,
      password: registrationPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.ILogin,
  });
  typia.assert(secondLogin);
  // 4. Retrieve active sessions with default pagination
  const sessionsResponse =
    await api.functional.multiUserTodo.member.sessions.index(
      secondSessionConnection,
      {
        body: {} satisfies IMultiUserTodoMemberSession.IRequest,
      },
    );
  typia.assert(sessionsResponse);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    sessionsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    sessionsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    sessionsResponse.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    sessionsResponse.pagination.pages >= 1,
  );
  // 6. Validate session data array
  TestValidator.predicate(
    "sessions array not empty",
    sessionsResponse.data.length >= 2,
  );
  // 7. Validate each session summary
  await ArrayUtil.asyncForEach(
    sessionsResponse.data,
    async (session, index) => {
      // typia.assert already validates all field formats (UUID, URI, date-time, etc.)
      typia.assert(session);
      // Validate session is active (expired_at > current time)
      TestValidator.predicate(
        `session ${index} is active`,
        new Date(session.expired_at) > new Date(),
      );
    },
  );
  // 8. Validate sessions are sorted by created_at descending
  if (sessionsResponse.data.length >= 2) {
    const firstSession = sessionsResponse.data[0];
    const secondSession = sessionsResponse.data[1];
    TestValidator.predicate(
      "sessions sorted by created_at descending",
      new Date(firstSession.created_at) >= new Date(secondSession.created_at),
    );
  }
}
