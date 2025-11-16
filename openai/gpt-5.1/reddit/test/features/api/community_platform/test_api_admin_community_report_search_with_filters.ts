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

export async function test_api_admin_community_report_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Register a memberUser (reporter) and authenticate
  const memberJoinInput = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberAuthorized);

  // 2. As that memberUser, create two distinct communities
  const communityVisibility = "public";
  const communityStatus = "active";

  const communityCreateBase = () =>
    ({
      slug: `${RandomGenerator.alphabets(8)}-${RandomGenerator.alphabets(4)}`,
      name: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      visibility: communityVisibility,
      status: communityStatus,
      is_nsfw: false,
      is_quarantined: false,
      is_posting_restricted: false,
      allow_text_posts: true,
      allow_link_posts: true,
      allow_image_posts: true,
    }) satisfies ICommunityPlatformCommunity.ICreate;

  const communityOne: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBase() },
    );
  typia.assert(communityOne);

  const communityTwo: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBase() },
    );
  typia.assert(communityTwo);

  // 3. As the same memberUser, create multiple community-level reports
  const reasonCategories = ["spam", "abuse", "policy_violation"] as const;

  type ReasonCategory = (typeof reasonCategories)[number];

  const reports: ICommunityPlatformCommunityReport[] = [];

  // Helper to create a report for a specific community and reason
  const createReport = async (
    communityId: string & tags.Format<"uuid">,
    reason: ReasonCategory,
  ) => {
    const createBody = {
      community_id: communityId,
      reason_category: reason,
      reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    } satisfies ICommunityPlatformCommunityReport.ICreate;

    const report: ICommunityPlatformCommunityReport =
      await api.functional.communityPlatform.memberUser.communityReports.create(
        connection,
        { body: createBody },
      );
    typia.assert(report);
    reports.push(report);
    return report;
  };

  // Create at least one report per community, with varying reasons
  await createReport(communityOne.id, "spam");
  await createReport(communityOne.id, "abuse");
  await createReport(communityTwo.id, "spam");
  await createReport(communityTwo.id, "policy_violation");

  // 4. Register an adminUser and authenticate
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(8)}`,
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 5. As admin, search community reports with filters

  // Choose filter: specific community (communityOne) and reason "spam"
  const targetCommunityId = communityOne.id;
  const targetReasonCategory: string = "spam";

  // Compute created_at min/max among created reports to define a window
  const createdAtValues = reports.map((r) => new Date(r.created_at).getTime());
  const minCreatedAt = Math.min(...createdAtValues);
  const maxCreatedAt = Math.max(...createdAtValues);

  // Extend window slightly around min/max
  const fromDate = new Date(minCreatedAt - 5_000).toISOString();
  const toDate = new Date(maxCreatedAt + 5_000).toISOString();

  const page = 1 as number & tags.Type<"int32">;
  const limit = 10 as number & tags.Type<"int32">;

  const searchBody = {
    page,
    limit,
    status: null,
    reason_category: targetReasonCategory,
    community_id: targetCommunityId,
    reporter_memberuser_id: null,
    created_from: fromDate,
    created_to: toDate,
    order_by: "created_at",
    order_direction: "desc",
    search: null,
  } satisfies ICommunityPlatformCommunityReport.IRequest;

  const pageResult: IPageICommunityPlatformCommunityReport.ISummary =
    await api.functional.communityPlatform.adminUser.communityReports.index(
      connection,
      { body: searchBody },
    );
  typia.assert(pageResult);

  const matchingReports = reports.filter(
    (r) =>
      r.community_id === targetCommunityId &&
      r.reason_category === targetReasonCategory &&
      new Date(r.created_at).getTime() >= new Date(fromDate).getTime() &&
      new Date(r.created_at).getTime() <= new Date(toDate).getTime(),
  );

  // 6. Assertions on returned data matching filters
  const returnedSummaries: ICommunityPlatformCommunityReport.ISummary[] =
    pageResult.data;

  for (const summary of returnedSummaries) {
    // Community filter
    TestValidator.equals(
      "each summary should belong to target community",
      summary.community.id,
      targetCommunityId,
    );

    // Reason category filter
    TestValidator.equals(
      "each summary should match reason_category filter",
      summary.reason_category,
      targetReasonCategory,
    );

    // Created_at range filter
    const createdAtMs = new Date(summary.created_at).getTime();
    TestValidator.predicate(
      "summary.created_at must be within requested range",
      createdAtMs >= new Date(fromDate).getTime() &&
        createdAtMs <= new Date(toDate).getTime(),
    );
  }

  // 7. Assert pagination metadata consistency
  const pagination = pageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // total records should be >= number of returned summaries and
  // should be at least as many as known matchingReports (if within page window)
  TestValidator.predicate(
    "pagination.records should be >= returned data length",
    pagination.records >= returnedSummaries.length,
  );

  TestValidator.predicate(
    "pagination.limit should be the same as requested limit",
    pagination.limit === limit,
  );

  TestValidator.predicate(
    "pagination.current should equal requested page",
    pagination.current === page,
  );

  // 8. Assert ordering by created_at descending
  for (let i = 1; i < returnedSummaries.length; i++) {
    const prev = new Date(returnedSummaries[i - 1].created_at).getTime();
    const curr = new Date(returnedSummaries[i].created_at).getTime();
    TestValidator.predicate(
      "created_at should be non-increasing for desc order",
      prev >= curr,
    );
  }
}
