import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and initial session
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(joined);
  // Create new connection with token from join result
  const sessionConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joined.token.access,
    },
  };
  // 2. Create multiple sessions with different timestamps
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  // Create session 1 (2 days ago)
  await api.functional.hrmTracker.member.sessions.index(sessionConnection, {
    body: {
      member_id: joined.id,
      created_at_start: twoDaysAgo.toISOString(),
      created_at_end: twoDaysAgo.toISOString(),
    } satisfies IHrmTrackerMemberSession.IRequest,
  });
  // Create session 2 (1 day ago)
  await api.functional.hrmTracker.member.sessions.index(sessionConnection, {
    body: {
      member_id: joined.id,
      created_at_start: oneDayAgo.toISOString(),
      created_at_end: oneDayAgo.toISOString(),
    } satisfies IHrmTrackerMemberSession.IRequest,
  });
  // Create session 3 (now)
  await api.functional.hrmTracker.member.sessions.index(sessionConnection, {
    body: {
      member_id: joined.id,
      created_at_start: now.toISOString(),
      created_at_end: now.toISOString(),
    } satisfies IHrmTrackerMemberSession.IRequest,
  });
  // 3. Test date range filtering (1 day ago to tomorrow)
  const filtered = await api.functional.hrmTracker.member.sessions.index(
    sessionConnection,
    {
      body: {
        created_at_start: oneDayAgo.toISOString(),
        created_at_end: tomorrow.toISOString(),
      } satisfies IHrmTrackerMemberSession.IRequest,
    },
  );
  typia.assert(filtered);
  // 4. Validate results
  TestValidator.equals(
    "pagination records matches",
    filtered.pagination.records,
    2,
  );
  TestValidator.equals("data length matches", filtered.data.length, 2);
  // Verify only correct sessions are returned
  const returnedIds = filtered.data.map((s) => s.id);
  TestValidator.predicate(
    "session1 excluded",
    !returnedIds.includes(joined.id),
  );
  TestValidator.predicate("session2 included", returnedIds.includes(joined.id));
  TestValidator.predicate("session3 included", returnedIds.includes(joined.id));
  // Verify pagination metadata
  TestValidator.equals("pagination limit", filtered.pagination.limit, 2);
  TestValidator.equals("pagination pages", filtered.pagination.pages, 1);
}
