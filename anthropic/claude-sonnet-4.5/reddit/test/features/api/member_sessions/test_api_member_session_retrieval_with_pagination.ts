import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";

/**
 * Test retrieving a member's authentication sessions with pagination support.
 *
 * This test validates that a member can view their own active login sessions
 * across different devices and locations for security monitoring purposes.
 *
 * Test workflow:
 *
 * 1. Create a new member account via join operation
 * 2. The join operation automatically creates an initial session
 * 3. Retrieve the member's sessions using pagination parameters
 * 4. Verify pagination metadata with correct current page, limit, total records,
 *    and pages
 * 5. Verify the data array contains at least one session record
 * 6. Validate session belongs to the authenticated member
 * 7. Confirm active sessions have null expired_at
 */
export async function test_api_member_session_retrieval_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Retrieve member's sessions with pagination
  const paginationRequest = {
    page: 1,
    limit: 10,
  } satisfies IRedditCommunityMemberSession.IRequest;

  const sessionsPage: IPageIRedditCommunityMemberSession.ISummary =
    await api.functional.redditCommunity.member.members.sessions.index(
      connection,
      {
        username: member.username,
        body: paginationRequest,
      },
    );
  typia.assert(sessionsPage);

  // Step 3: Validate pagination metadata
  const pagination: IPage.IPagination = sessionsPage.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "current page index is 0 (zero-based)",
    pagination.current,
    0,
  );
  TestValidator.equals("limit is 10", pagination.limit, 10);
  TestValidator.predicate(
    "total records is at least 1",
    pagination.records >= 1,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );

  // Step 4: Validate session data array
  TestValidator.predicate(
    "sessions array contains at least one session",
    sessionsPage.data.length >= 1,
  );

  // Step 5: Validate session belongs to authenticated member
  const session: IRedditCommunityMemberSession.ISummary = sessionsPage.data[0];
  typia.assert(session);

  TestValidator.equals(
    "session belongs to authenticated member",
    session.reddit_community_member_id,
    member.id,
  );

  // Step 6: Verify expired_at is null for active session
  TestValidator.equals(
    "active session has null expired_at",
    session.expired_at,
    null,
  );
}
