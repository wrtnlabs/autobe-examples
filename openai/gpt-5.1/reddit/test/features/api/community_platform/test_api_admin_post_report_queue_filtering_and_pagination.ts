import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReportTarget";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";

/**
 * Validate complex filtering, sorting, and pagination behavior of the adminUser
 * post-report moderation queue.
 *
 * Business flow:
 *
 * 1. Register an adminUser via /auth/adminUser/join.
 * 2. Register a memberUser via /auth/memberUser/join.
 * 3. As memberUser, create two communities.
 * 4. As memberUser, create several posts across both communities.
 * 5. As memberUser, file multiple post reports with varied reason_category and
 *    severity values.
 * 6. As adminUser, query PATCH /communityPlatform/adminUser/reports/queues/post
 *    (index) several times using different
 *    ICommunityPlatformPostReport.IRequest payloads to exercise:
 *
 *    - Severity filtering
 *    - Status filtering (using a plausible default like "open")
 *    - CommunityId filtering
 *    - Pagination metadata (page/pageSize/current/limit/records/pages)
 *    - Sorting by created_at asc/desc
 *    - Sorting by severity asc/desc (lexicographically)
 *    - Out-of-range page index returning an empty data array.
 */
export async function test_api_admin_post_report_queue_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register adminUser (join) – SDK will attach Authorization header
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!", // satisfies tags.Format<"password"> in schema
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register memberUser (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassw0rd!",
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As memberUser, create two distinct communities
  const communityCreateBase = (
    slug: string,
    name: string,
  ): ICommunityPlatformCommunity.ICreate => ({
    slug,
    name,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  });

  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBase(
          `community-${RandomGenerator.alphaNumeric(8)}`,
          RandomGenerator.paragraph({ sentences: 2 }),
        ),
      },
    );
  typia.assert(community1);

  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBase(
          `community-${RandomGenerator.alphaNumeric(8)}`,
          RandomGenerator.paragraph({ sentences: 2 }),
        ),
      },
    );
  typia.assert(community2);

  // 4. As memberUser, create several posts across both communities
  const makePostCreate = (
    community: ICommunityPlatformCommunity,
    titleSeed: string,
  ): ICommunityPlatformPost.ICreate => ({
    communityId: community.id,
    communityCode: community.slug,
    title: titleSeed,
    body: RandomGenerator.paragraph({ sentences: 6 }),
    url: undefined,
    postType: "text",
  });

  const posts: ICommunityPlatformPost[] = [];

  // create 3 posts in community1
  for (let i = 0; i < 3; i += 1) {
    const post = await api.functional.communityPlatform.memberUser.posts.create(
      connection,
      {
        body: makePostCreate(community1, `Post in community1 #${i + 1}`),
      },
    );
    typia.assert(post);
    posts.push(post);
  }

  // create 2 posts in community2
  for (let i = 0; i < 2; i += 1) {
    const post = await api.functional.communityPlatform.memberUser.posts.create(
      connection,
      {
        body: makePostCreate(community2, `Post in community2 #${i + 1}`),
      },
    );
    typia.assert(post);
    posts.push(post);
  }

  // 5. As memberUser, file multiple post reports with varied reason_category and severity
  const severityValues = ["low", "medium", "high", "critical"] as const;
  const reasonCategories = ["spam", "harassment", "hate"] as const;

  const reports: ICommunityPlatformPostReport[] = [];

  // For each post, create between 1-2 reports with different severities/reasons
  for (let i = 0; i < posts.length; i += 1) {
    const post = posts[i];

    const firstReportBody = {
      post_id: post.id,
      reason_category: reasonCategories[i % reasonCategories.length],
      reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
      severity: severityValues[i % severityValues.length],
    } satisfies ICommunityPlatformPostReport.ICreate;

    const firstReport =
      await api.functional.communityPlatform.memberUser.postReports.create(
        connection,
        {
          body: firstReportBody,
        },
      );
    typia.assert(firstReport);
    reports.push(firstReport);

    if (i % 2 === 0) {
      const secondReportBody = {
        post_id: post.id,
        reason_category: reasonCategories[(i + 1) % reasonCategories.length],
        reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
        severity: severityValues[(i + 1) % severityValues.length],
      } satisfies ICommunityPlatformPostReport.ICreate;

      const secondReport =
        await api.functional.communityPlatform.memberUser.postReports.create(
          connection,
          {
            body: secondReportBody,
          },
        );
      typia.assert(secondReport);
      reports.push(secondReport);
    }
  }

  TestValidator.predicate(
    "at least 5 reports created for queue tests",
    reports.length >= 5,
  );

  // capture distinct severities present for later filtering tests
  const distinctSeverities = Array.from(
    new Set(reports.map((r) => r.severity)),
  );

  // 6. Switch to adminUser context: explicitly login to ensure admin token is active
  const adminLoginBody = {
    identifier: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginResult: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // Helper to call queue index
  async function queryQueue(
    body: ICommunityPlatformPostReport.IRequest,
  ): Promise<IPageICommunityPlatformPostReport.ISummary> {
    const page =
      await api.functional.communityPlatform.adminUser.reports.queues.post.index(
        connection,
        { body },
      );
    typia.assert(page);
    return page;
  }

  // Base request with no filters other than pagination
  const baseRequest: ICommunityPlatformPostReport.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    pageSize: 10 as number & tags.Type<"int32">,
    targetType: "post",
    status: undefined,
    severity: undefined,
    reportedUserId: undefined,
    reportingUserId: undefined,
    communityId: undefined,
    from: undefined,
    to: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  };

  // 6-a. Basic pagination and unfiltered queue
  const unfilteredPage = await queryQueue(baseRequest);

  TestValidator.predicate(
    "unfiltered queue returns at least as many records as we created (or more)",
    unfilteredPage.pagination.records >= reports.length,
  );

  TestValidator.predicate(
    "unfiltered queue page current matches request page",
    unfilteredPage.pagination.current === baseRequest.page,
  );

  TestValidator.predicate(
    "unfiltered queue page limit matches request pageSize",
    unfilteredPage.pagination.limit === baseRequest.pageSize,
  );

  TestValidator.predicate(
    "unfiltered queue pages computed consistently",
    unfilteredPage.pagination.pages >= 1,
  );

  // 6-b. Filter by severity (pick one existing severity, prefer high or critical)
  const severityForFilter = distinctSeverities.includes("high")
    ? "high"
    : distinctSeverities[0];

  const severityFilteredPage = await queryQueue({
    ...baseRequest,
    page: 1 as number & tags.Type<"int32">,
    severity: severityForFilter,
  });

  TestValidator.predicate(
    "severity-filtered queue only contains reports with requested severity",
    severityFilteredPage.data.every(
      (summary) => summary.severity === severityForFilter,
    ),
  );

  // 6-c. Filter by a specific communityId (use community1)
  const communityFilteredPage = await queryQueue({
    ...baseRequest,
    page: 1 as number & tags.Type<"int32">,
    communityId: community1.id,
  });

  TestValidator.predicate(
    "community-filtered page only includes reports whose target community matches community1",
    communityFilteredPage.data.every((summary) =>
      summary.target.community === undefined
        ? false
        : summary.target.community.id === community1.id,
    ),
  );

  // 6-d. Status filtering – we assume default status is "open" (no status mutation APIs available here)
  const statusFilteredPage = await queryQueue({
    ...baseRequest,
    page: 1 as number & tags.Type<"int32">,
    status: "open",
  });

  TestValidator.predicate(
    "status-filtered queue either empty or contains only open-status reports",
    statusFilteredPage.data.every((summary) => summary.status === "open"),
  );

  // 6-e. Sorting by created_at ascending vs descending
  const sortedByCreatedAsc = await queryQueue({
    ...baseRequest,
    sortBy: "created_at",
    sortDirection: "asc",
  });

  const ascTimestamps = sortedByCreatedAsc.data.map(
    (summary) => summary.created_at,
  );

  const sortedAscCopy = [...ascTimestamps].sort((a, b) => a.localeCompare(b));

  TestValidator.equals(
    "created_at ascending order respected",
    ascTimestamps,
    sortedAscCopy,
  );

  const sortedByCreatedDesc = await queryQueue({
    ...baseRequest,
    sortBy: "created_at",
    sortDirection: "desc",
  });

  const descTimestamps = sortedByCreatedDesc.data.map(
    (summary) => summary.created_at,
  );

  const sortedDescCopy = [...descTimestamps].sort((a, b) => b.localeCompare(a));

  TestValidator.equals(
    "created_at descending order respected",
    descTimestamps,
    sortedDescCopy,
  );

  // 6-f. Sorting by severity lexicographically asc/desc
  const sortedBySeverityAsc = await queryQueue({
    ...baseRequest,
    sortBy: "severity",
    sortDirection: "asc",
  });

  const severityAscValues = sortedBySeverityAsc.data.map(
    (summary) => summary.severity,
  );

  const severityAscSortedCopy = [...severityAscValues].sort((a, b) =>
    a.localeCompare(b),
  );

  TestValidator.equals(
    "severity ascending order respected (lexicographical)",
    severityAscValues,
    severityAscSortedCopy,
  );

  const sortedBySeverityDesc = await queryQueue({
    ...baseRequest,
    sortBy: "severity",
    sortDirection: "desc",
  });

  const severityDescValues = sortedBySeverityDesc.data.map(
    (summary) => summary.severity,
  );

  const severityDescSortedCopy = [...severityDescValues].sort((a, b) =>
    b.localeCompare(a),
  );

  TestValidator.equals(
    "severity descending order respected (lexicographical)",
    severityDescValues,
    severityDescSortedCopy,
  );

  // 6-g. Out-of-range page: choose a page index beyond existing pages
  const outOfRangePageIndex = (unfilteredPage.pagination.pages + 10) as number &
    tags.Type<"int32">;

  const outOfRangePage = await queryQueue({
    ...baseRequest,
    page: outOfRangePageIndex,
  });

  TestValidator.equals(
    "out-of-range page returns empty data array",
    outOfRangePage.data.length,
    0,
  );

  TestValidator.equals(
    "out-of-range pagination records remain stable",
    outOfRangePage.pagination.records,
    unfilteredPage.pagination.records,
  );

  TestValidator.equals(
    "out-of-range pagination pages remain stable",
    outOfRangePage.pagination.pages,
    unfilteredPage.pagination.pages,
  );
}
