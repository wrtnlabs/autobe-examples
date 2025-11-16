import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityReport";

/**
 * Validate that admin community report search returns an empty page when
 * filters intentionally match no records.
 *
 * Business context:
 *
 * - Admins review community-level reports through PATCH
 *   /communityPlatform/adminUser/communityReports.
 * - We want to ensure that when filters are outside any existing report’s
 *   created_at window (or otherwise non-matching), the API returns a proper
 *   empty page rather than leaking unrelated items.
 *
 * Steps:
 *
 * 1. Register an adminUser.
 * 2. Register a memberUser.
 * 3. As memberUser, create a community.
 * 4. As memberUser, create a community-level report for that community so the
 *    table is not globally empty.
 * 5. As adminUser, search community reports with filters that cannot match any
 *    existing record (e.g., created_from / created_to far in the future).
 * 6. Assert that pagination.records === 0 and pagination.pages === 0, and that
 *    data is an empty array.
 */
export async function test_api_admin_community_report_search_empty_result(
  connection: api.IConnection,
) {
  // 1. Register an adminUser and keep credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin!" + RandomGenerator.alphaNumeric(8);

  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: adminEmail,
    password: "AdminPassword123!", // Format<"password"> but just a normal string
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register a memberUser and keep credentials
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Member!" + RandomGenerator.alphaNumeric(8);

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As memberUser, create a community
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. As memberUser, create at least one community-level report for that community
  const reportCreateBody = {
    community_id: community.id,
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityReport.ICreate;

  const report: ICommunityPlatformCommunityReport =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 5. Switch to adminUser via login (even though join has already set token,
  //    we follow the dependency spec to exercise login as well)
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 6. Call search with filters that match no records. Use a future time range
  // far beyond any created_at of the seeded report.
  const futureFrom = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureTo = new Date(
    Date.now() + 366 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const emptySearchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    status: null,
    reason_category: null,
    community_id: null,
    reporter_memberuser_id: null,
    created_from: futureFrom,
    created_to: futureTo,
    order_by: null,
    order_direction: null,
    search: null,
  } satisfies ICommunityPlatformCommunityReport.IRequest;

  const emptyPage: IPageICommunityPlatformCommunityReport.ISummary =
    await api.functional.communityPlatform.adminUser.communityReports.index(
      connection,
      {
        body: emptySearchBody,
      },
    );
  typia.assert(emptyPage);

  // 7. Assert empty pagination and data
  const pagination: IPage.IPagination = emptyPage.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "empty search: records must be 0",
    pagination.records,
    0,
  );

  TestValidator.equals(
    "empty search: pages should be 0 when there are no records",
    pagination.pages,
    0,
  );

  TestValidator.equals(
    "empty search: data array must be empty",
    emptyPage.data.length,
    0,
  );
}
