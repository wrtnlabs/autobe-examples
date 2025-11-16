import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

/**
 * Validate pagination behavior of the platform admin report search endpoint
 * across multiple pages.
 *
 * Business flow:
 *
 * 1. Create a platform admin account and authenticate as that admin.
 * 2. Create a single report reason category that all test reports will reference.
 * 3. Create a member user account and authenticate as that member.
 * 4. As the member, create more than one page worth of reports (e.g., 25)
 *    referencing the same reason category.
 * 5. Switch back to the platform admin context.
 * 6. Call PATCH /communityPlatform/platformAdmin/reports for page 1 (pageSize 10)
 *    with filters that match the created reports and assert correct pagination
 *    metadata and page size.
 * 7. Call the endpoint again for page 2 and assert that it returns a different,
 *    non-overlapping set of ids compared to page 1.
 * 8. Call the endpoint for page 3 and ensure it returns at most pageSize items and
 *    that pagination metadata remains consistent.
 * 9. Call the endpoint for a page beyond the last and assert that it returns an
 *    empty data array while keeping pagination metadata stable.
 * 10. Validate that the createdAt ordering across concatenated pages is stable and
 *     monotonic based on the default sort behavior.
 */
export async function test_api_admin_report_search_pagination_across_multiple_pages(
  connection: api.IConnection,
) {
  // 1. Register platform admin and keep credentials for later login
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = "password123";

  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Create a report reason category under platform admin context
  const reasonCategoryBody = {
    code: `spam_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: reasonCategoryBody },
    );
  typia.assert(reasonCategory);

  // 3. Register member user
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword = "password123";

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: memberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  // 4. Login as member user to ensure correct actor when creating reports
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 5. Bulk-create > 1 page of reports (e.g., 25) as the member user
  const totalReports = 25;
  const createdReportIds: string[] = [];

  await ArrayUtil.asyncRepeat(totalReports, async (index) => {
    const createReportBody = {
      reporter_type: "member",
      report_reason_category_id: reasonCategory.id,
      community_id: null,
      severity: index % 2 === 0 ? "low" : "medium",
      description: RandomGenerator.paragraph({ sentences: 6 }),
    } satisfies ICommunityPlatformReport.ICreate;

    const createdReport: ICommunityPlatformReport =
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        { body: createReportBody },
      );
    typia.assert(createdReport);
    createdReportIds.push(createdReport.id);
  });

  TestValidator.equals(
    "created expected number of reports",
    createdReportIds.length,
    totalReports,
  );

  // 6. Switch back to platform admin context using login to ensure admin actor
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // Helper to build request bodies for the reports.index search
  const buildSearchRequest = (page: number, pageSize: number) => {
    const requestBody = {
      page,
      pageSize,
      reporter_types: ["member"],
      reason_category_ids: [reasonCategory.id],
      created_from: null,
      created_to: null,
      resolved_from: null,
      resolved_to: null,
      description_query: null,
      sort_by: null,
      sort_direction: null,
    } satisfies ICommunityPlatformReport.IRequest;
    return requestBody;
  };

  const pageSize = 10;

  // 7. Fetch page 1
  const page1Response: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.index(
      connection,
      {
        body: buildSearchRequest(1, pageSize),
      },
    );
  typia.assert(page1Response);

  const { pagination: p1, data: data1 } = page1Response;

  TestValidator.equals("page 1 current index is 1", p1.current, 1);
  TestValidator.equals("page 1 limit is pageSize", p1.limit, pageSize);
  TestValidator.predicate(
    "page 1 records should be at least totalReports",
    p1.records >= totalReports,
  );
  TestValidator.predicate("page 1 pages should be at least 3", p1.pages >= 3);
  TestValidator.equals("page 1 has 10 items", data1.length, pageSize);

  // Verify that page 1 items match the filters
  data1.forEach((summary, index) => {
    // reasonCategory should match our created category
    TestValidator.equals(
      `page 1 item ${index} reasonCategory id matches`,
      summary.reasonCategory.id,
      reasonCategory.id,
    );
    // status should have non-empty string
    TestValidator.predicate(
      `page 1 item ${index} status is non-empty`,
      summary.status.length > 0,
    );
  });

  const idsPage1 = data1.map((s) => s.id);

  // 8. Fetch page 2
  const page2Response: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.index(
      connection,
      {
        body: buildSearchRequest(2, pageSize),
      },
    );
  typia.assert(page2Response);

  const { pagination: p2, data: data2 } = page2Response;

  TestValidator.equals("page 2 current index is 2", p2.current, 2);
  TestValidator.equals("page 2 limit is pageSize", p2.limit, pageSize);
  TestValidator.equals(
    "page 2 records consistent with page 1",
    p2.records,
    p1.records,
  );
  TestValidator.equals(
    "page 2 pages consistent with page 1",
    p2.pages,
    p1.pages,
  );
  TestValidator.equals("page 2 has 10 items", data2.length, pageSize);

  data2.forEach((summary, index) => {
    TestValidator.equals(
      `page 2 item ${index} reasonCategory id matches`,
      summary.reasonCategory.id,
      reasonCategory.id,
    );
  });

  const idsPage2 = data2.map((s) => s.id);

  // Ensure no overlap between page 1 and page 2 ids
  const overlapIds = idsPage1.filter((id) => idsPage2.includes(id));
  TestValidator.equals(
    "no overlap in ids between page 1 and page 2",
    overlapIds.length,
    0,
  );

  // 9. Fetch page 3
  const page3Response: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.index(
      connection,
      {
        body: buildSearchRequest(3, pageSize),
      },
    );
  typia.assert(page3Response);

  const { pagination: p3, data: data3 } = page3Response;

  TestValidator.equals("page 3 current index is 3", p3.current, 3);
  TestValidator.equals("page 3 limit is pageSize", p3.limit, pageSize);
  TestValidator.equals(
    "page 3 records consistent with page 1",
    p3.records,
    p1.records,
  );
  TestValidator.equals(
    "page 3 pages consistent with page 1",
    p3.pages,
    p1.pages,
  );

  TestValidator.predicate(
    "page 3 has between 0 and pageSize items",
    data3.length >= 0 && data3.length <= pageSize,
  );

  const idsPage3 = data3.map((s) => s.id);

  // Unique ids across the first 3 pages should not exceed total records
  const allIds = [...idsPage1, ...idsPage2, ...idsPage3];
  const uniqueIds = Array.from(new Set(allIds));

  TestValidator.predicate(
    "unique ids across first 3 pages should not exceed total records",
    uniqueIds.length <= p1.records,
  );

  // 10. Fetch a page beyond the last (pages + 1)
  const beyondLastPage = p1.pages + 1;
  const beyondResponse: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.platformAdmin.reports.index(
      connection,
      {
        body: buildSearchRequest(beyondLastPage, pageSize),
      },
    );
  typia.assert(beyondResponse);

  const { pagination: pBeyond, data: dataBeyond } = beyondResponse;

  TestValidator.equals(
    "beyond-last page current index matches requested",
    pBeyond.current,
    beyondLastPage,
  );
  TestValidator.equals(
    "beyond-last page has same limit",
    pBeyond.limit,
    p1.limit,
  );
  TestValidator.equals(
    "beyond-last page keeps records stable",
    pBeyond.records,
    p1.records,
  );
  TestValidator.equals(
    "beyond-last page keeps pages stable",
    pBeyond.pages,
    p1.pages,
  );
  TestValidator.equals("beyond-last page has empty data", dataBeyond.length, 0);

  // 11. Validate ordering stability across pages 1-3 based on createdAt
  const combinedSummaries = [...data1, ...data2, ...data3];

  if (combinedSummaries.length > 1) {
    for (let i = 0; i < combinedSummaries.length - 1; i++) {
      const currentCreatedAt = combinedSummaries[i].createdAt;
      const nextCreatedAt = combinedSummaries[i + 1].createdAt;

      // Assuming default sort is createdAt descending: current >= next
      TestValidator.predicate(
        `createdAt ordering is non-increasing between index ${i} and ${i + 1}`,
        currentCreatedAt >= nextCreatedAt,
      );
    }
  }
}
