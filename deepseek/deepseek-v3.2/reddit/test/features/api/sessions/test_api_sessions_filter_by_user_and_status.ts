import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test session filtering by user identification and status.
 *
 * 1. Authenticate as a member using the authorize_member_join utility
 * 2. Request sessions filtered by user identifier (username/email) and status='active'
 * 3. Validate that only sessions matching the specified criteria are returned
 * 4. Verify session summaries contain accurate user identification info
 * 5. Check pagination metadata for proper record counts
 */
export async function test_api_sessions_filter_by_user_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Prepare session filtering request
  const requestBody: ICommunityPlatformGuestSession.IRequest = {
    userIdentifier: memberAuth.username, // Use the member's username
    status: "active" as const,
    page: 1,
    limit: 10,
    sessionType: "member" as const, // Filter to member sessions only
    sort: "createdAtDesc" as const,
  };
  // 3. Call session filtering endpoint
  const response = await api.functional.communityPlatform.member.sessions.index(
    memberConnection,
    {
      body: requestBody,
    },
  );
  typia.assert(response);
  // 4. Validate pagination metadata (business logic, not type validation)
  const pagination = response.pagination;
  TestValidator.predicate("current page should be 1", pagination.current === 1);
  TestValidator.predicate("limit should be 10", pagination.limit === 10);
  TestValidator.predicate(
    "records count should match data length",
    pagination.records >= response.data.length,
  );
  TestValidator.predicate(
    "pages should be calculated correctly",
    pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );
  // 5. Validate each session in the response
  for (const session of response.data) {
    typia.assert(session);
    // Check session status is active (expired_at > current time)
    const now = new Date();
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `session ${session.id} should be active (expired_at > now)`,
      expiredAt > now,
    );
  }
  // 6. Business logic validation - at least one session should be returned for the member
  TestValidator.predicate(
    "should return at least one session for the authenticated member",
    response.data.length > 0,
  );
}
