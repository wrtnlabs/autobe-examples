import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_primary_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResponse);
  // 2. Create new connection with authorization token for session listing
  const sessionConnection: api.IConnection = { host: connection.host };
  sessionConnection.headers = { Authorization: authResponse.token.access };
  // 3. List member sessions with pagination parameters
  const sessionsResponse =
    await api.functional.redditCommunity.member.sessions.index(
      sessionConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sortField: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(sessionsResponse);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    sessionsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    sessionsResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    sessionsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    sessionsResponse.pagination.pages >= 0,
  );
  // 5. Validate session records exist and have required fields
  if (sessionsResponse.data.length > 0) {
    const firstSession = sessionsResponse.data[0];
    typia.assert(firstSession);
    // Validate required session fields exist
    TestValidator.predicate("session has id", firstSession.id !== undefined);
    TestValidator.predicate(
      "session has memberId",
      firstSession.redditCommunityMemberId !== undefined,
    );
    TestValidator.predicate(
      "session has createdAt",
      firstSession.createdAt !== undefined,
    );
    TestValidator.predicate(
      "session has expiredAt",
      firstSession.expiredAt !== undefined,
    );
    // Validate member ID matches authenticated member
    TestValidator.equals(
      "session member ID matches auth",
      firstSession.redditCommunityMemberId,
      authResponse.id,
    );
    // Validate timestamp format
    const createdAt = new Date(firstSession.createdAt);
    const expiredAt = new Date(firstSession.expiredAt);
    TestValidator.predicate(
      "createdAt is valid date",
      !isNaN(createdAt.getTime()),
    );
    TestValidator.predicate(
      "expiredAt is valid date",
      !isNaN(expiredAt.getTime()),
    );
    // Validate active session status (deleted_at is null, expired_at in future)
    TestValidator.predicate(
      "session expiredAt is in future",
      expiredAt > new Date(),
    );
  }
  // 6. Validate all sessions belong to the authenticated member
  for (const session of sessionsResponse.data) {
    TestValidator.equals(
      `session ${session.id} belongs to member`,
      session.redditCommunityMemberId,
      authResponse.id,
    );
  }
  // 7. Validate sorted order (most recent first)
  if (sessionsResponse.data.length > 1) {
    for (let i = 0; i < sessionsResponse.data.length - 1; i++) {
      const current = sessionsResponse.data[i];
      const next = sessionsResponse.data[i + 1];
      const currentDate = new Date(current.createdAt);
      const nextDate = new Date(next.createdAt);
      TestValidator.predicate(
        "sessions are sorted by created_at desc",
        currentDate >= nextDate,
      );
    }
  }
}