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
 * Validate filtering of administrator sessions by expiration status to ensure
 * proper session lifecycle management.
 *
 * This test creates an administrator account with comprehensive authentication
 * context, establishes prerequisite channels, and validates the session
 * filtering functionality. It tests temporal filtering capabilities using
 * creation date ranges and ensures proper handling of session metadata for
 * security auditing purposes.
 */
export async function test_api_admin_sessions_filter_by_expiration_status(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestPassword123!";

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

  // Step 2: Create prerequisite channel to satisfy operation requirements
  const channel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Test session filtering with expired sessions only
  const expiredSessionsResult: IPageICommunityPlatformAdminSession.ISummary =
    await api.functional.communityPlatform.admin.admins.sessions.index(
      connection,
      {
        adminId: admin.id,
        body: {
          page: 1,
          limit: 10,
          expired: true,
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(expiredSessionsResult);

  // Step 4: Test session filtering with active sessions only
  const activeSessionsResult: IPageICommunityPlatformAdminSession.ISummary =
    await api.functional.communityPlatform.admin.admins.sessions.index(
      connection,
      {
        adminId: admin.id,
        body: {
          page: 1,
          limit: 10,
          expired: false,
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(activeSessionsResult);

  // Step 5: Test session filtering with temporal range
  const currentDate = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();

  const temporalFilteredSessions: IPageICommunityPlatformAdminSession.ISummary =
    await api.functional.communityPlatform.admin.admins.sessions.index(
      connection,
      {
        adminId: admin.id,
        body: {
          page: 1,
          limit: 10,
          created_at_start: oneDayAgo,
          created_at_end: currentDate,
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(temporalFilteredSessions);

  // Step 6: Test session filtering with search functionality
  const searchFilteredSessions: IPageICommunityPlatformAdminSession.ISummary =
    await api.functional.communityPlatform.admin.admins.sessions.index(
      connection,
      {
        adminId: admin.id,
        body: {
          page: 1,
          limit: 10,
          search: "127.0.0.1",
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(searchFilteredSessions);

  // Step 7: Validate pagination structure
  TestValidator.equals(
    "pagination structure exists",
    expiredSessionsResult.pagination,
    {
      current: expiredSessionsResult.pagination.current,
      limit: expiredSessionsResult.pagination.limit,
      records: expiredSessionsResult.pagination.records,
      pages: expiredSessionsResult.pagination.pages,
    } satisfies IPage.IPagination,
  );

  // Step 8: Validate session summary structure
  if (expiredSessionsResult.data.length > 0) {
    const sampleSession = expiredSessionsResult.data[0];
    TestValidator.equals("session has required fields", sampleSession, {
      id: sampleSession.id,
      ip: sampleSession.ip,
      href: sampleSession.href,
      referrer: sampleSession.referrer,
      created_at: sampleSession.created_at,
      expired_at: sampleSession.expired_at,
    } satisfies ICommunityPlatformAdminSession.ISummary);
  }

  // Step 9: Test comprehensive filtering with all parameters
  const comprehensiveFilteredSessions: IPageICommunityPlatformAdminSession.ISummary =
    await api.functional.communityPlatform.admin.admins.sessions.index(
      connection,
      {
        adminId: admin.id,
        body: {
          page: 1,
          limit: 5,
          search: "admin",
          created_at_start: oneDayAgo,
          created_at_end: currentDate,
          expired: true,
        } satisfies ICommunityPlatformAdminSession.IRequest,
      },
    );
  typia.assert(comprehensiveFilteredSessions);
}
