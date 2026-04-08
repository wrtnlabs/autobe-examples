import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can retrieve a paginated list of their own active authentication sessions.
 *
 * Validates the session listing functionality for authenticated members. Tests that members can view their active sessions with proper data isolation, ensuring they only see their own authentication sessions. Verifies session structure includes member information, IP address, page URLs, and lifecycle timestamps.
 *
 * Special attention is given to verifying data isolation (only own sessions returned), active session filtering (deleted_at is null), and pagination metadata accuracy.
 *
 * 1. Register a new member account which automatically creates the first authentication session.
 * 2. Query the session list endpoint with status filter for active sessions.
 * 3. Validate response structure matches IPageIRedditCloneMemberSession.ISummary schema.
 * 4. Verify all returned sessions belong to the authenticated member (member_id matches).
 * 5. Verify active sessions have deleted_at = null and valid expiration timestamps.
 * 6. Verify pagination metadata is correct with at least one session from registration.
 */
export async function test_api_member_session_list_active_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Query active sessions for this member
  const sessions =
    await api.functional.redditClone.member.member.sessions.index(
      memberConnection,
      {
        body: {
          member_id: member.id,
          status: "active",
        } satisfies IRedditCloneMemberSession.IRequest,
      },
    );
  typia.assert(sessions);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    sessions.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", sessions.pagination.limit, 20);
  TestValidator.predicate(
    "has at least one session",
    sessions.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    sessions.pagination.pages >= 1,
  );
  // 4. Validate session data array
  TestValidator.predicate(
    "sessions array not empty",
    sessions.data.length >= 1,
  );
  // 5. Validate each session in the list
  await ArrayUtil.asyncForEach(sessions.data, async (session) => {
    typia.assert(session);
    // Verify session belongs to authenticated member
    TestValidator.equals(
      "session belongs to member",
      session.member.id,
      member.id,
    );
    TestValidator.equals(
      "session member email matches",
      session.member.email,
      member.email,
    );
    TestValidator.equals(
      "session member username matches",
      session.member.username,
      member.username,
    );
    // Verify active session properties
    TestValidator.equals(
      "active session not deleted",
      session.deleted_at,
      null,
    );
    TestValidator.predicate("session has valid IP", session.ip.length > 0);
    TestValidator.predicate("session has valid href", session.href.length > 0);
    TestValidator.predicate(
      "session has creation timestamp",
      session.created_at.length > 0,
    );
    TestValidator.predicate(
      "session has expiration timestamp",
      session.expired_at.length > 0,
    );
    // Verify member profile data exists
    TestValidator.predicate(
      "member has display name",
      session.member.profile.display_name.length > 0,
    );
    TestValidator.predicate(
      "member has karma score",
      typeof session.member.profile.karma === "number",
    );
  });
}
