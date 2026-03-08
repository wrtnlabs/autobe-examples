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

/**
 * Test that a newly registered member can retrieve their session list and see
 * the session created during registration.
 *
 * **Test Flow**:
 * 1. Register a new member account via POST /auth/member/join (creates initial session)
 * 2. Call PATCH /member/sessions to retrieve the session list
 * 3. Verify pagination metadata (current page, limit, records, pages)
 * 4. Verify session list contains at least one session with correct fields
 * 5. Verify the session from join is visible
 * 6. Verify deletedAt is null for active session
 * 7. Verify sessions are ordered by createdAt descending
 */
export async function test_api_member_sessions_list_after_join(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  typia.assert(joinResult);
  // Step 2: Retrieve session list for the newly registered member
  const sessionList: IPageICommunityPlatformMemberSession.ISummary =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {} satisfies ICommunityPlatformMemberSession.IRequest,
      },
    );
  typia.assert(sessionList);
  // Step 3: Validate pagination metadata structure
  TestValidator.equals(
    "pagination.current should be 1",
    sessionList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination.limit should be positive",
    sessionList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records should be at least 1",
    sessionList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination.pages should be at least 1",
    sessionList.pagination.pages >= 1,
  );
  // Step 4: Verify at least one session exists (from registration)
  TestValidator.predicate(
    "session list should have at least one session",
    sessionList.data.length >= 1,
  );
  // Step 5: Validate session fields for the first (most recent) session
  const session = sessionList.data[0];
  typia.assert(session);
  // Verify session has valid UUID
  TestValidator.predicate(
    "session.id should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.id,
    ),
  );
  // Verify IP address is captured
  TestValidator.predicate(
    "session.ip should not be empty",
    session.ip.length > 0,
  );
  // Verify href is captured
  TestValidator.predicate(
    "session.href should not be empty",
    session.href.length > 0,
  );
  // Step 6: Verify deletedAt is null for active session
  TestValidator.equals(
    "session.deletedAt should be null for active session",
    session.deletedAt,
    null,
  );
  // Step 7: Verify createdAt and expiredAt are valid date strings
  TestValidator.predicate(
    "session.createdAt should be valid date",
    !isNaN(Date.parse(session.createdAt)),
  );
  TestValidator.predicate(
    "session.expiredAt should be valid date",
    !isNaN(Date.parse(session.expiredAt)),
  );
  // Verify expiredAt is after createdAt
  TestValidator.predicate(
    "session.expiredAt should be after createdAt",
    new Date(session.expiredAt) > new Date(session.createdAt),
  );
  // Step 8: Verify sessions are ordered by createdAt descending (most recent first)
  if (sessionList.data.length > 1) {
    for (let i = 1; i < sessionList.data.length; i++) {
      const prevDate = new Date(sessionList.data[i - 1].createdAt);
      const currDate = new Date(sessionList.data[i].createdAt);
      TestValidator.predicate(
        "sessions should be ordered by createdAt descending",
        prevDate >= currDate,
      );
    }
  }
}
