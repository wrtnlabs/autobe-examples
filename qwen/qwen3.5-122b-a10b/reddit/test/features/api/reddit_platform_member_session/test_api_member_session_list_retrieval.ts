import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberSession";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberJoinInput = {
    email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    username: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformMember.IJoin;
  const authResult = await authorize_member_join(connection, {
    body: memberJoinInput,
  });
  typia.assert(authResult);
  // 2. Create member-specific connection with authentication token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: authResult.token.access,
  };
  // 3. Retrieve session list with pagination
  const sessionList = await api.functional.redditPlatform.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformMemberSession.IRequest,
    },
  );
  typia.assert(sessionList);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    sessionList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", sessionList.pagination.limit, 10);
  TestValidator.predicate(
    "has at least one session",
    sessionList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    sessionList.pagination.pages >= 1,
  );
  // 5. Validate session data structure
  TestValidator.predicate(
    "session list is array",
    Array.isArray(sessionList.data),
  );
  TestValidator.predicate("has session data", sessionList.data.length > 0);
  // 6. Validate first session has required fields
  const firstSession = sessionList.data[0];
  typia.assert(firstSession);
  // 7. Validate member summary in session
  TestValidator.predicate(
    "session has member info",
    firstSession.member !== null && firstSession.member !== undefined,
  );
  TestValidator.equals(
    "member id matches authenticated user",
    firstSession.member.id,
    authResult.id,
  );
  TestValidator.equals(
    "member username matches",
    firstSession.member.username,
    authResult.username,
  );
  TestValidator.predicate(
    "member has karma score",
    typeof firstSession.member.karma_score === "number",
  );
  // 8. Test pagination with different parameters
  const sessionListPage2 =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IRedditPlatformMemberSession.IRequest,
      },
    );
  typia.assert(sessionListPage2);
  TestValidator.equals(
    "pagination current page is 2",
    sessionListPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 5",
    sessionListPage2.pagination.limit,
    5,
  );
  // 9. Test filtering by IP address
  const sessionListByIp =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          ip: firstSession.ip,
        } satisfies IRedditPlatformMemberSession.IRequest,
      },
    );
  typia.assert(sessionListByIp);
  TestValidator.predicate(
    "filtered by IP returns results",
    sessionListByIp.data.length >= 1,
  );
  TestValidator.predicate(
    "all filtered sessions match IP",
    sessionListByIp.data.every((s) => s.ip === firstSession.ip),
  );
  // 10. Test filtering by date range
  const sessionListByDate =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          created_at_from: firstSession.created_at,
        } satisfies IRedditPlatformMemberSession.IRequest,
      },
    );
  typia.assert(sessionListByDate);
  TestValidator.predicate(
    "filtered by date returns results",
    sessionListByDate.data.length >= 1,
  );
  TestValidator.predicate(
    "all filtered sessions have correct date",
    sessionListByDate.data.every(
      (s) => s.created_at >= firstSession.created_at,
    ),
  );
}