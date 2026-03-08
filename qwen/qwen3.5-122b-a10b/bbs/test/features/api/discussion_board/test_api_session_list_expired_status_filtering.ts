import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_list_expired_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to access session monitoring endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Query sessions with expired=true to retrieve only expired sessions
  const expiredSessionsResponse =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      {
        body: {
          expired: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardGuestSession.IRequest,
      },
    );
  typia.assert(expiredSessionsResponse);
  // 3. Query sessions with expired=false to retrieve only active sessions
  const activeSessionsResponse =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      {
        body: {
          expired: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardGuestSession.IRequest,
      },
    );
  typia.assert(activeSessionsResponse);
  // 4. Verify session filtering logic - expired sessions should have expired_at < now
  await TestValidator.predicate(
    "expired sessions are actually expired",
    async () => {
      const now = new Date();
      const allExpired = expiredSessionsResponse.data.every(
        (session) => new Date(session.expired_at) < now,
      );
      return allExpired;
    },
  );
  // 5. Verify session filtering logic - active sessions should have expired_at >= now
  await TestValidator.predicate(
    "active sessions are actually active",
    async () => {
      const now = new Date();
      const allActive = activeSessionsResponse.data.every(
        (session) => new Date(session.expired_at) >= now,
      );
      return allActive;
    },
  );
  // 6. Validate pagination consistency
  TestValidator.equals(
    "expired sessions pagination current page",
    expiredSessionsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "expired sessions pagination limit",
    expiredSessionsResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "expired sessions pagination records non-negative",
    expiredSessionsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "expired sessions pagination pages non-negative",
    expiredSessionsResponse.pagination.pages >= 0,
  );
  TestValidator.equals(
    "active sessions pagination current page",
    activeSessionsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "active sessions pagination limit",
    activeSessionsResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "active sessions pagination records non-negative",
    activeSessionsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "active sessions pagination pages non-negative",
    activeSessionsResponse.pagination.pages >= 0,
  );
  // 7. Validate that data array length matches pagination expectations
  TestValidator.predicate(
    "expired sessions data length within limit",
    expiredSessionsResponse.data.length <=
      expiredSessionsResponse.pagination.limit,
  );
  TestValidator.predicate(
    "active sessions data length within limit",
    activeSessionsResponse.data.length <=
      activeSessionsResponse.pagination.limit,
  );
}
