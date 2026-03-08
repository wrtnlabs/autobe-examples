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

export async function test_api_member_sessions_list(
  connection: api.IConnection,
): Promise<void> {
  // Test session filtering for authenticated member. First, authenticate the member account using POST /todoApp/auth/member/join to establish an initial session. Then, perform a second authentication operation using POST /todoApp/auth/member/refresh to create additional session records for the same member. This will result in multiple session entries in the database. Make a PATCH request to /todoApp/member/sessions with pagination parameters to retrieve the list of sessions. Validate that the response contains multiple session entries for the same member account. Verify that the session data includes correct metadata such as creation timestamp and expiration information. This test validates the session list retrieval and pagination functionality for authenticated members.
  // 1. Register member account and create initial session
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Refresh authentication to create additional session
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: joinResult.token.refresh,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(refreshResult);
  // 3. Retrieve member sessions with pagination
  const sessionsConnection: api.IConnection = { host: connection.host };
  const sessionsResponse = await api.functional.todoApp.member.sessions.index(
    sessionsConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sessionsResponse);
  // 4. Validate that multiple sessions exist
  TestValidator.predicate("session count", sessionsResponse.data.length >= 2);
  // 5. Verify session metadata for first session
  const firstSession = sessionsResponse.data[0];
  typia.assert(firstSession);
  // 6. Verify pagination information
  TestValidator.equals(
    "pagination current page",
    sessionsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    sessionsResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "pagination records count",
    sessionsResponse.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination pages count",
    sessionsResponse.pagination.pages >= 1,
  );
  // 7. Verify session has status field with valid value
  TestValidator.predicate(
    "session status is valid",
    firstSession.status === "active" || firstSession.status === "expired",
  );
}
