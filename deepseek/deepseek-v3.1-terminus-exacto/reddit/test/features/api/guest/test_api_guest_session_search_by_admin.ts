import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";

/**
 * Test that administrators can search and filter guest sessions for platform
 * monitoring and analytics.
 *
 * This E2E test validates comprehensive search functionality including
 * pagination, date range filtering, and inclusion of deleted sessions. An
 * administrator performs various search queries to verify guest session
 * tracking, activity monitoring, and platform usage analysis capabilities.
 */
export async function test_api_guest_session_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Test basic pagination search
  const basicSearchResult: IPageICommunityPlatformGuest =
    await api.functional.communityPlatform.admin.guests.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformGuest.IRequest,
    });
  typia.assert(basicSearchResult);

  TestValidator.equals(
    "pagination should have valid structure",
    basicSearchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be respected",
    basicSearchResult.data.length <= 10,
  );

  // 3. Test date range filtering
  const startDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
  const endDate = new Date().toISOString(); // current time

  const dateRangeSearchResult: IPageICommunityPlatformGuest =
    await api.functional.communityPlatform.admin.guests.index(connection, {
      body: {
        page: 1,
        limit: 5,
        created_at_start: startDate,
        created_at_end: endDate,
      } satisfies ICommunityPlatformGuest.IRequest,
    });
  typia.assert(dateRangeSearchResult);

  // 4. Test include_deleted flag
  const includeDeletedResult: IPageICommunityPlatformGuest =
    await api.functional.communityPlatform.admin.guests.index(connection, {
      body: {
        page: 1,
        limit: 15,
        include_deleted: true,
      } satisfies ICommunityPlatformGuest.IRequest,
    });
  typia.assert(includeDeletedResult);

  // 5. Test different limit values
  const smallLimitResult: IPageICommunityPlatformGuest =
    await api.functional.communityPlatform.admin.guests.index(connection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies ICommunityPlatformGuest.IRequest,
    });
  typia.assert(smallLimitResult);
  TestValidator.predicate(
    "small limit should return limited results",
    smallLimitResult.data.length <= 1,
  );

  const largeLimitResult: IPageICommunityPlatformGuest =
    await api.functional.communityPlatform.admin.guests.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformGuest.IRequest,
    });
  typia.assert(largeLimitResult);
  TestValidator.predicate(
    "large limit should return up to 50 results",
    largeLimitResult.data.length <= 50,
  );

  // 6. Test multiple page navigation
  const page2Result: IPageICommunityPlatformGuest =
    await api.functional.communityPlatform.admin.guests.index(connection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies ICommunityPlatformGuest.IRequest,
    });
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 should have correct page number",
    page2Result.pagination.current,
    2,
  );

  // 7. Validate guest session data structure
  if (basicSearchResult.data.length > 0) {
    const guestSession = basicSearchResult.data[0];
    typia.assert(guestSession);

    TestValidator.predicate(
      "guest session should have valid ID",
      guestSession.id.length > 0,
    );
    TestValidator.predicate(
      "guest session should have session token",
      guestSession.session_token.length > 0,
    );
    TestValidator.predicate(
      "guest session should have creation timestamp",
      guestSession.created_at.length > 0,
    );
    TestValidator.predicate(
      "guest session should have update timestamp",
      guestSession.updated_at.length > 0,
    );
  }
}
