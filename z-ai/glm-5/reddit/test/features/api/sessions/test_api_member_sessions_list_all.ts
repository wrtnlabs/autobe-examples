import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Call sessions endpoint to retrieve all sessions (without active filter)
  const sessions = await api.functional.communityPlatform.member.sessions.index(
    memberConnection,
    {
      body: {} satisfies ICommunityPlatformMemberSession.IRequest,
    },
  );
  typia.assert(sessions);
  // 3. Verify pagination defaults (page=1, limit=20)
  TestValidator.equals("default page is 1", sessions.pagination.current, 1);
  TestValidator.equals("default limit is 20", sessions.pagination.limit, 20);
  TestValidator.predicate(
    "records count is valid",
    sessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    sessions.pagination.pages >= 0,
  );
  // 4. Verify at least one session exists (current login session)
  TestValidator.predicate(
    "session list is not empty",
    sessions.data.length >= 1,
  );
  // 5. Verify sessions are sorted by created_at descending (most recent first)
  if (sessions.data.length > 1) {
    for (let i = 0; i < sessions.data.length - 1; i++) {
      const currentCreatedAt = new Date(sessions.data[i].created_at).getTime();
      const nextCreatedAt = new Date(sessions.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "sessions sorted by created_at descending",
        currentCreatedAt >= nextCreatedAt,
      );
    }
  }
  // 6. Test with explicit active: false parameter returns same results
  const allSessions =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          active: false,
        } satisfies ICommunityPlatformMemberSession.IRequest,
      },
    );
  typia.assert(allSessions);
  TestValidator.equals(
    "active false returns same total records",
    allSessions.pagination.records,
    sessions.pagination.records,
  );
}
