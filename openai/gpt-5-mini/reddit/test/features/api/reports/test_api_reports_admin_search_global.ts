import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsReport";

/**
 * Validate system administrator global report search with filters and
 * pagination.
 *
 * Business context:
 *
 * - System administrators must be able to search and triage reports globally
 *   across communities. The listing should support filters (target_type,
 *   community_slug, priority/status, text query) and pagination. Reporter PII
 *   must be redacted in list responses and access must be restricted to admin
 *   actors.
 *
 * Test steps:
 *
 * 1. Register a system administrator account and capture tokens.
 * 2. Register a community member account and capture tokens.
 * 3. As the community member, create a community and a post in that community.
 * 4. As the community member, create a report against the post.
 * 5. As the system admin, call the admin reports index with filters and
 *    pagination; validate pagination metadata, presence of the created report,
 *    and that reporter PII is not exposed in the public listing.
 * 6. Verify access control by calling the admin endpoint without admin credentials
 *    and expecting an error.
 */
export async function test_api_reports_admin_search_global(
  connection: api.IConnection,
) {
  // 1) Create system administrator
  const adminConn: api.IConnection = { ...connection, headers: {} };
  const adminEmail = `sysadmin+${Date.now()}@example.test`;
  const adminAuth = await api.functional.auth.systemAdmin.join(adminConn, {
    body: {
      email: adminEmail,
      password: "Passw0rd!",
      display_name: "E2E System Admin",
    } satisfies ICommunityBbsSystemAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2) Create community member
  const memberConn: api.IConnection = { ...connection, headers: {} };
  const memberEmail = `member+${Date.now()}@example.test`;
  const memberUsername = `member_${RandomGenerator.alphaNumeric(6)}`;
  const memberAuth = await api.functional.auth.communityMember.join(
    memberConn,
    {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: "Passw0rd!",
        session_context: {
          href: "http://localhost/test",
          referrer: "http://localhost/",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    },
  );
  typia.assert(memberAuth);

  // 3) Create a unique community as the member
  const uniqueSlug = `test-community-${Date.now()}`;
  const createCommunityBody = {
    name: RandomGenerator.name(2),
    slug: uniqueSlug,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibility: "public",
  } satisfies ICommunityBbsCommunity.ICreate;

  const community =
    await api.functional.communityBbs.communityMember.communities.create(
      memberConn,
      { body: createCommunityBody },
    );
  typia.assert(community);

  // 4) Create a text post in the community as the member
  const createPostBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    post_type: "text",
  } satisfies ICommunityBbsPost.ICreate;

  const post =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      memberConn,
      {
        communitySlug: community.slug,
        body: createPostBody,
      },
    );
  typia.assert(post);

  // 5) File a report against the created post as the community member
  const createReportBody = {
    target_type: "post",
    target_id: post.id,
    reason_code: "spam",
    explanation: "E2E test report: admin search target",
  } satisfies ICommunityBbsReport.ICreate;

  const createdReport = await api.functional.communityBbs.reports.create(
    memberConn,
    {
      body: createReportBody,
    },
  );
  typia.assert(createdReport);

  // 6) As system admin, search reports globally with filters and pagination
  const adminSearchRequest = {
    target_type: "post",
    community_slug: community.slug,
    limit: 10,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies ICommunityBbsReport.IRequest;

  const page = await api.functional.communityBbs.systemAdmin.reports.index(
    adminConn,
    {
      body: adminSearchRequest,
    },
  );
  typia.assert(page);

  // Validate pagination metadata
  TestValidator.equals(
    "pagination.limit should match requested limit",
    page.pagination.limit,
    10,
  );

  // Validate that the created report is present in the returned list
  TestValidator.predicate(
    "returned reports include created report",
    page.data.some((r) => r.id === createdReport.id),
  );

  // Validate returned report summaries and reporter PII redaction
  for (const r of page.data) {
    TestValidator.predicate(
      `report ${r.id} target_type is post`,
      r.target_type === "post",
    );
    TestValidator.predicate(
      `report ${r.id} has reason_code`,
      typeof r.reason_code === "string" && r.reason_code.length > 0,
    );

    if (r.reporter) {
      // Reporter summary must include non-sensitive fields and must NOT expose email
      TestValidator.predicate(
        `report ${r.id} reporter has id`,
        typeof r.reporter.id === "string" && r.reporter.id.length > 0,
      );
      TestValidator.predicate(
        `report ${r.id} reporter has username`,
        typeof r.reporter.username === "string" &&
          r.reporter.username.length > 0,
      );
      // Ensure email is not exposed in the reporter summary
      TestValidator.predicate(
        `report ${r.id} reporter PII redacted (no email)`,
        !Object.prototype.hasOwnProperty.call(r.reporter, "email"),
      );
    }
  }

  // 7) Access control: unauthenticated or non-admin should NOT be able to call the admin endpoint
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated call to admin reports should fail",
    async () => {
      await api.functional.communityBbs.systemAdmin.reports.index(unauthConn, {
        body: {
          target_type: "post",
        } satisfies ICommunityBbsReport.IRequest,
      });
    },
  );
}
