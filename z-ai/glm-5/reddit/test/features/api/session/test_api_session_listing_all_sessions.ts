import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test listing all authentication sessions for the authenticated member.
 *
 * Workflow:
 * 1. Create a new member account and authenticate via authorize_member_join
 * 2. Retrieve all sessions for the authenticated member
 * 3. Verify pagination metadata structure
 * 4. Verify at least one session exists (the current login session)
 * 5. Validate session data structure and member ownership
 * 6. Confirm sessions are ordered by created_at DESC
 */
export async function test_api_session_listing_all_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. List all sessions for the authenticated member
  const sessions = await api.functional.community.member.sessions.index(
    memberConnection,
    { body: {} satisfies ICommunityMemberSession.IRequest },
  );
  typia.assert(sessions);
  // 3. Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    () => sessions.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    () => sessions.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    () => sessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    () => sessions.pagination.pages >= 0,
  );
  // 4. Verify at least one session exists (current login session)
  TestValidator.predicate(
    "at least one session exists",
    () => sessions.data.length >= 1,
  );
  // 5. Verify all sessions belong to the authenticated member
  for (const session of sessions.data) {
    TestValidator.equals(
      "session member matches authenticated member",
      session.member.id,
      member.id,
    );
    TestValidator.predicate("access token is masked", () =>
      session.accessToken.includes("..."),
    );
  }
  // 6. Verify sessions are ordered by created_at DESC (most recent first)
  if (sessions.data.length > 1) {
    const dates = sessions.data.map((s) => new Date(s.createdAt).getTime());
    for (let i = 0; i < dates.length - 1; i++) {
      TestValidator.predicate(
        "sessions ordered by created_at DESC",
        () => dates[i] >= dates[i + 1],
      );
    }
  }
}
