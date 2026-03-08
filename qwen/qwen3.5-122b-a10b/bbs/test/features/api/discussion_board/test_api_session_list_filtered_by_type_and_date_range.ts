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

export async function test_api_session_list_filtered_by_type_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create base member for authentication
  const baseMemberConnection: api.IConnection = { host: connection.host };
  const baseMember = await authorize_member_join(baseMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(baseMember);
  // 2. Create additional members to generate multiple sessions
  const memberSessions: IDiscussionBoardMember.IAuthorized[] = [];
  await ArrayUtil.asyncRepeat(5, async (index) => {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(1),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
    typia.assert(member);
    memberSessions.push(member);
  });
  // 3. Query all member sessions without filters first
  const allMemberSessionsConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_member_join(allMemberSessionsConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  const allSessions =
    await api.functional.discussionBoard.member.sessions.index(
      allMemberSessionsConnection,
      {
        body: {
          session_type: "member",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardGuestSession.IRequest,
      },
    );
  typia.assert(allSessions);
  // 4. Test filtering by session_type = 'member'
  const memberTypeFilterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberTypeFilterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  const memberTypeFiltered =
    await api.functional.discussionBoard.member.sessions.index(
      memberTypeFilterConnection,
      {
        body: {
          session_type: "member",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardGuestSession.IRequest,
      },
    );
  typia.assert(memberTypeFiltered);
  // Verify all returned sessions are of type 'member'
  for (const session of memberTypeFiltered.data) {
    TestValidator.equals("session type is member", session.type, "member");
  }
  // 5. Test filtering by date range
  // Get current session timestamps to create a date range
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const dateRangeFilterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(dateRangeFilterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  const dateRangeFiltered =
    await api.functional.discussionBoard.member.sessions.index(
      dateRangeFilterConnection,
      {
        body: {
          session_type: "member",
          created_at_from: twoHoursAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardGuestSession.IRequest,
      },
    );
  typia.assert(dateRangeFiltered);
  // Verify all sessions in date range are within the specified range
  for (const session of dateRangeFiltered.data) {
    const sessionDate = new Date(session.created_at);
    TestValidator.predicate(
      "session created after from date",
      sessionDate >= twoHoursAgo,
    );
    TestValidator.predicate(
      "session created before to date",
      sessionDate <= now,
    );
  }
  // 6. Test pagination with filters
  TestValidator.equals(
    "pagination current page is 1",
    dateRangeFiltered.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    dateRangeFiltered.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    dateRangeFiltered.pagination.records >= 0,
  );
  // 7. Verify filtered count is less than or equal to total
  TestValidator.predicate(
    "filtered count <= total count",
    dateRangeFiltered.pagination.records <= allSessions.pagination.records,
  );
}
