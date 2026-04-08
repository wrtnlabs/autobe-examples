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

export async function test_api_session_filter_by_ip_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account to create a session
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.alphabets(10),
      href: "https://example.com/register",
      referrer: "https://google.com",
    },
  });
  typia.assert(authorized);
  // 2. Test IP address filtering - get all sessions first to find IP pattern
  const allSessions = await api.functional.redditClone.member.sessions.index(
    memberConnection,
    {
      body: {} satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(allSessions);
  TestValidator.equals("has sessions", allSessions.data.length > 0, true);
  const sessionIp = allSessions.data[0]?.ip ?? "127.0.0.1";
  // Extract partial IP for matching (first 2 octets)
  const ipParts = sessionIp.split(".");
  const partialIp =
    ipParts.length >= 2 ? `${ipParts[0]}.${ipParts[1]}` : sessionIp;
  // 3. Filter by partial IP address pattern
  const ipFilteredSessions =
    await api.functional.redditClone.member.sessions.index(memberConnection, {
      body: {
        ip: partialIp,
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(ipFilteredSessions);
  TestValidator.equals(
    "has filtered sessions",
    ipFilteredSessions.data.length > 0,
    true,
  );
  for (const session of ipFilteredSessions.data) {
    TestValidator.predicate(
      "session IP matches pattern",
      session.ip.includes(partialIp),
    );
  }
  // 4. Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateFilteredSessions =
    await api.functional.redditClone.member.sessions.index(memberConnection, {
      body: {
        createdAfter: oneDayAgo.toISOString() satisfies string &
          tags.Format<"date-time">,
        createdBefore: oneDayFromNow.toISOString() satisfies string &
          tags.Format<"date-time">,
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(dateFilteredSessions);
  TestValidator.equals(
    "has date filtered sessions",
    dateFilteredSessions.data.length > 0,
    true,
  );
  for (const session of dateFilteredSessions.data) {
    const sessionDate = new Date(session.created_at);
    TestValidator.predicate(
      "session within date range",
      sessionDate >= oneDayAgo && sessionDate <= oneDayFromNow,
    );
  }
  // 5. Test combined IP and date range filters
  const combinedFilteredSessions =
    await api.functional.redditClone.member.sessions.index(memberConnection, {
      body: {
        ip: partialIp,
        createdAfter: oneDayAgo.toISOString() satisfies string &
          tags.Format<"date-time">,
        createdBefore: oneDayFromNow.toISOString() satisfies string &
          tags.Format<"date-time">,
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(combinedFilteredSessions);
  TestValidator.equals(
    "has combined filtered sessions",
    combinedFilteredSessions.data.length > 0,
    true,
  );
  for (const session of combinedFilteredSessions.data) {
    TestValidator.predicate(
      "session IP matches combined filter",
      session.ip.includes(partialIp),
    );
    const sessionDate = new Date(session.created_at);
    TestValidator.predicate(
      "session within combined date range",
      sessionDate >= oneDayAgo && sessionDate <= oneDayFromNow,
    );
  }
  // 6. Test pagination with filters
  const paginatedSessions =
    await api.functional.redditClone.member.sessions.index(memberConnection, {
      body: {
        ip: partialIp,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(paginatedSessions);
  TestValidator.equals(
    "pagination page",
    paginatedSessions.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedSessions.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    paginatedSessions.pagination.records >= 0,
  );
  // 7. Test that sessions outside date range are excluded
  const pastDateRange = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(now.getTime() - 364 * 24 * 60 * 60 * 1000);
  const pastFilteredSessions =
    await api.functional.redditClone.member.sessions.index(memberConnection, {
      body: {
        createdAfter: pastDateRange.toISOString() satisfies string &
          tags.Format<"date-time">,
        createdBefore: oneYearAgo.toISOString() satisfies string &
          tags.Format<"date-time">,
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(pastFilteredSessions);
  // Sessions created now should NOT be in this old date range
  for (const session of pastFilteredSessions.data) {
    const sessionDate = new Date(session.created_at);
    TestValidator.predicate(
      "old sessions not in future date range",
      sessionDate < oneYearAgo,
    );
  }
}
