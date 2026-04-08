import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_session_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account to create sessions for filtering
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: email,
      password: password,
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Retrieve sessions with status='active' filter - only expired_at > NOW()
  const activeSessions = await api.functional.redditClone.member.sessions.index(
    memberConnection,
    {
      body: {
        status: "active",
        limit: 20,
        page: 1,
      } satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(activeSessions);
  // 3. Validate all returned sessions are active (expired_at > current time)
  const now = new Date();
  for (const session of activeSessions.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      "session expired_at should be in the future for active status",
      expiredAt.getTime() > now.getTime(),
    );
  }
  // 4. Retrieve sessions with status='expired' filter - only expired_at <= NOW()
  const expiredSessions =
    await api.functional.redditClone.member.sessions.index(memberConnection, {
      body: {
        status: "expired",
        limit: 20,
        page: 1,
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(expiredSessions);
  // 5. Validate all returned sessions are expired (expired_at <= current time)
  for (const session of expiredSessions.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      "session expired_at should be in the past for expired status",
      expiredAt.getTime() <= now.getTime(),
    );
  }
  // 6. Test pagination with status filter
  const paginatedActiveSessions =
    await api.functional.redditClone.member.sessions.index(memberConnection, {
      body: {
        status: "active",
        limit: 5,
        page: 1,
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(paginatedActiveSessions);
  TestValidator.equals(
    "paginated active sessions limit should be 5",
    paginatedActiveSessions.pagination.limit,
    5,
  );
  TestValidator.equals(
    "paginated active sessions page should be 1",
    paginatedActiveSessions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "active sessions count should not exceed limit",
    paginatedActiveSessions.data.length <= 5,
  );
  // 7. Validate pagination metadata exists
  TestValidator.predicate(
    "active sessions pagination records should be set",
    paginatedActiveSessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "active sessions pagination pages should be calculated",
    paginatedActiveSessions.pagination.pages >= 0,
  );
}
