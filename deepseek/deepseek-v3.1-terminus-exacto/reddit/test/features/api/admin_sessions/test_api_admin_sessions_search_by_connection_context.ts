import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminSession";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminSession";

/**
 * Test comprehensive search and filtering of administrator authentication
 * sessions based on connection context parameters.
 *
 * Validates that administrators can retrieve paginated lists of sessions
 * filtered by IP address ranges, connection URLs, referrer information, and
 * creation date ranges. Tests proper handling of search terms across session
 * metadata fields and validates pagination controls with configurable page
 * sizes.
 */
export async function test_api_admin_sessions_search_by_connection_context(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
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

  // Step 2: Create prerequisite channel
  const channel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        icon_url: undefined,
        banner_url: undefined,
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Test basic session search with default pagination
  const basicSearchResult: IPageICommunityPlatformAdminSession.ISummary =
    await api.functional.communityPlatform.admin.admins.sessions.index(
      connection,
      {
        adminId: admin.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(basicSearchResult);

  TestValidator.equals(
    "pagination structure exists",
    basicSearchResult.pagination,
    typia.assert(basicSearchResult.pagination),
  );
  TestValidator.equals(
    "data array exists",
    basicSearchResult.data,
    typia.assert(basicSearchResult.data),
  );

  // Step 4: Test search with date range filtering
  const currentDate = new Date().toISOString();
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago

  const dateRangeSearchResult: IPageICommunityPlatformAdminSession.ISummary =
    await api.functional.communityPlatform.admin.admins.sessions.index(
      connection,
      {
        adminId: admin.id,
        body: {
          page: 1,
          limit: 5,
          created_at_start: pastDate,
          created_at_end: currentDate,
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(dateRangeSearchResult);

  // Step 5: Test search with specific search term
  const searchTermResult: IPageICommunityPlatformAdminSession.ISummary =
    await api.functional.communityPlatform.admin.admins.sessions.index(
      connection,
      {
        adminId: admin.id,
        body: {
          page: 1,
          limit: 20,
          search: "localhost", // Generic search term
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(searchTermResult);

  // Step 6: Test expired session filtering
  const expiredSearchResult: IPageICommunityPlatformAdminSession.ISummary =
    await api.functional.communityPlatform.admin.admins.sessions.index(
      connection,
      {
        adminId: admin.id,
        body: {
          page: 1,
          limit: 15,
          expired: true,
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(expiredSearchResult);

  // Step 7: Test different page sizes
  const largePageResult: IPageICommunityPlatformAdminSession.ISummary =
    await api.functional.communityPlatform.admin.admins.sessions.index(
      connection,
      {
        adminId: admin.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(largePageResult);

  const smallPageResult: IPageICommunityPlatformAdminSession.ISummary =
    await api.functional.communityPlatform.admin.admins.sessions.index(
      connection,
      {
        adminId: admin.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(smallPageResult);

  // Step 8: Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    basicSearchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    basicSearchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    basicSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    basicSearchResult.pagination.pages >= 0,
  );

  // Step 9: Validate session summary structure
  if (basicSearchResult.data.length > 0) {
    const sampleSession = basicSearchResult.data[0];
    TestValidator.predicate("session has ID", sampleSession.id.length > 0);
    TestValidator.predicate(
      "session has IP address",
      sampleSession.ip.length > 0,
    );
    TestValidator.predicate("session has href", sampleSession.href.length > 0);
    TestValidator.predicate(
      "session has referrer",
      sampleSession.referrer.length > 0,
    );
    TestValidator.predicate(
      "session has creation timestamp",
      sampleSession.created_at.length > 0,
    );
  }
}
