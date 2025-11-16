import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityReport";

/**
 * Verify filtering of community-level reports in the admin queue by status and
 * reason_category.
 *
 * Business context:
 *
 * - Member users can file reports against entire communities using
 *   ICommunityPlatformCommunityReport.ICreate.
 * - Admin users can view a paginated queue of these reports using PATCH
 *   /communityPlatform/adminUser/reports/queues/community with
 *   ICommunityPlatformCommunityReport.IRequest filters.
 *
 * Test workflow:
 *
 * 1. Register an adminUser and a memberUser.
 * 2. Authenticate as memberUser (if not already authenticated by join).
 * 3. Create two communities as the memberUser.
 * 4. Join each community as the same memberUser.
 * 5. Create multiple community reports targeting those communities with at least
 *    two reports sharing the same reason_category and at least one with a
 *    different reason_category.
 * 6. Observe the status values from created reports, and pick one status together
 *    with a chosen reason_category that at least one report uses.
 * 7. Switch to the adminUser context.
 * 8. Call the admin queue index endpoint with a filter specifying the chosen
 *    status and reason_category.
 * 9. Assert that all returned summaries:
 *
 *    - Have the requested status.
 *    - Have the requested reason_category.
 *    - Are a subset of the reports we created that match both filters.
 * 10. Assert pagination metadata (records, current, limit) is consistent with the
 *     number of matched summaries.
 * 11. Call the index endpoint again with a different filter combination (e.g.,
 *     reason_category only) and verify that the result set expands/shrinks as
 *     expected and still only contains matching records.
 */
export async function test_api_community_report_queue_filtering_by_status_and_reason(
  connection: api.IConnection,
) {
  // 1. Register an adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!", // satisfies password format
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminEmail = adminAuthorized.email;

  // 2. Register a memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberEmail = memberAuthorized.email;

  // 3. Ensure we are authenticated as memberUser (login explicit)
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 4. Create two communities as memberUser
  const communityCreateBody1 = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
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

  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody1 },
    );
  typia.assert(community1);

  const communityCreateBody2 = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
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

  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody2 },
    );
  typia.assert(community2);

  // 5. Join each community as memberUser
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership1: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community1.slug,
        body: membershipBody,
      },
    );
  typia.assert(membership1);

  const membership2: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community2.slug,
        body: membershipBody,
      },
    );
  typia.assert(membership2);

  // 6. Create multiple community-level reports with different reason_category values
  const reasonCategoryA = "spam";
  const reasonCategoryB = "abuse";

  const reports: ICommunityPlatformCommunityReport[] = [];

  const report1Body = {
    community_id: community1.id,
    reason_category: reasonCategoryA,
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityReport.ICreate;
  const report1 =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      { body: report1Body },
    );
  typia.assert(report1);
  reports.push(report1);

  const report2Body = {
    community_id: community2.id,
    reason_category: reasonCategoryA,
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityReport.ICreate;
  const report2 =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      { body: report2Body },
    );
  typia.assert(report2);
  reports.push(report2);

  const report3Body = {
    community_id: community1.id,
    reason_category: reasonCategoryB,
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityReport.ICreate;
  const report3 =
    await api.functional.communityPlatform.memberUser.communityReports.create(
      connection,
      { body: report3Body },
    );
  typia.assert(report3);
  reports.push(report3);

  // 7. Choose a status and reason_category combination based on created reports
  const targetReasonCategory = reasonCategoryA;
  const targetStatus = reports[0].status;

  const expectedMatchesStatusAndReason = reports.filter(
    (r) =>
      r.status === targetStatus && r.reason_category === targetReasonCategory,
  );

  // Sanity check that we actually have at least one matching report
  await TestValidator.predicate(
    "there is at least one report matching chosen status and reason_category",
    expectedMatchesStatusAndReason.length > 0,
  );

  // 8. Switch to adminUser context using admin login
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 9. Call admin community report queue with status + reason_category filter
  const filterRequest1 = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    status: targetStatus,
    reason_category: targetReasonCategory,
    community_id: null,
    reporter_memberuser_id: null,
    created_from: null,
    created_to: null,
    order_by: null,
    order_direction: null,
    search: null,
  } satisfies ICommunityPlatformCommunityReport.IRequest;

  const page1: IPageICommunityPlatformCommunityReport.ISummary =
    await api.functional.communityPlatform.adminUser.reports.queues.community.index(
      connection,
      { body: filterRequest1 },
    );
  typia.assert(page1);

  // 10. Validate that all returned summaries match filters and subset of expected reports
  const summaries1 = page1.data;

  for (const summary of summaries1) {
    TestValidator.equals(
      "summary reason_category matches filter",
      summary.reason_category,
      targetReasonCategory,
    );
    TestValidator.equals(
      "summary status matches filter",
      summary.status,
      targetStatus,
    );

    const existsInExpected = expectedMatchesStatusAndReason.some(
      (r) => r.id === summary.id,
    );
    TestValidator.predicate(
      "summary corresponds to one of the expected reports",
      existsInExpected,
    );
  }

  // Records in pagination should be at least the number of summaries in current page
  TestValidator.predicate(
    "pagination.records is >= number of summaries in current page (status+reason)",
    page1.pagination.records >= summaries1.length,
  );

  // 11. Call index with a different filter: same reason_category but status unspecified
  const filterRequest2 = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    status: null,
    reason_category: targetReasonCategory,
    community_id: null,
    reporter_memberuser_id: null,
    created_from: null,
    created_to: null,
    order_by: null,
    order_direction: null,
    search: null,
  } satisfies ICommunityPlatformCommunityReport.IRequest;

  const page2: IPageICommunityPlatformCommunityReport.ISummary =
    await api.functional.communityPlatform.adminUser.reports.queues.community.index(
      connection,
      { body: filterRequest2 },
    );
  typia.assert(page2);

  const summaries2 = page2.data;

  // All summaries should have the requested reason_category
  for (const summary of summaries2) {
    TestValidator.equals(
      "summary reason_category matches filter when only reason_category is set",
      summary.reason_category,
      targetReasonCategory,
    );
  }

  // Expect at least as many results as the status+reason subset (or equal if all share same status)
  TestValidator.predicate(
    "reason-only filter returns at least as many or equal records as status+reason filter",
    summaries2.length >= summaries1.length,
  );

  // Pagination metadata sanity checks for second request
  TestValidator.predicate(
    "pagination.records is >= number of summaries in current page (reason only)",
    page2.pagination.records >= summaries2.length,
  );
}
