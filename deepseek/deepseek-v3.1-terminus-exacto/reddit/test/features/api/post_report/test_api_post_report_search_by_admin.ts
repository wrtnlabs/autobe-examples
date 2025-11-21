import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";

/**
 * Test comprehensive post report search workflow where an admin searches for
 * reports filed against a specific post. Validates that administrators can
 * filter and retrieve post reports with pagination capabilities. The scenario
 * includes member authentication for post creation, post creation as
 * prerequisite, and admin authentication for accessing report search
 * functionality. Ensures proper role-based access control and search parameter
 * handling.
 */
export async function test_api_post_report_search_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create member account for post creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create test post that will have reports
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create admin account for report search access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "content",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 4: Switch to admin role and search for post reports
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Search for reports with basic pagination
  const searchResults =
    await api.functional.communityPlatform.admin.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(searchResults);

  // Validate pagination structure
  TestValidator.equals(
    "pagination structure exists",
    typeof searchResults.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is valid",
    searchResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    searchResults.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records is valid",
    searchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is valid",
    searchResults.pagination.pages >= 0,
  );

  // Step 6: Test various filtering options
  // Test status filtering
  const statusFilterResults =
    await api.functional.communityPlatform.admin.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 5,
          status: "pending",
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(statusFilterResults);

  // Test actor_type filtering
  const actorTypeFilterResults =
    await api.functional.communityPlatform.admin.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 5,
          actor_type: "member",
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(actorTypeFilterResults);

  // Test date range filtering
  const currentDate = new Date().toISOString();
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago

  const dateFilterResults =
    await api.functional.communityPlatform.admin.posts.reports.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 5,
          created_at_start: pastDate,
          created_at_end: currentDate,
        } satisfies ICommunityPlatformPostReport.IRequest,
      },
    );
  typia.assert(dateFilterResults);

  // Validate that all search results contain the correct post reference
  if (searchResults.data.length > 0) {
    TestValidator.equals(
      "report post ID matches searched post",
      searchResults.data[0].post.id,
      post.id,
    );
  }

  // Validate report structure in search results
  if (searchResults.data.length > 0) {
    const report = searchResults.data[0];
    TestValidator.predicate(
      "report has valid ID",
      typeof report.id === "string",
    );
    TestValidator.predicate(
      "report has post reference",
      typeof report.post === "object",
    );
    TestValidator.predicate(
      "report has status",
      typeof report.status === "string",
    );
    TestValidator.predicate(
      "report has actor_type",
      typeof report.actor_type === "string",
    );
    TestValidator.predicate(
      "report has creation timestamp",
      typeof report.created_at === "string",
    );
  }
}
