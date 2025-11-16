import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";

export async function test_api_moderator_report_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Create platform admin and stay authenticated as platformAdmin
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: "AdminPass123!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://platform.test/admin/join",
    referrer: "https://platform.test/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platformAdmin, create a visibility level
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Public Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code should match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. As platformAdmin, create two report reason categories
  const reasonCode1 = `spam_${RandomGenerator.alphaNumeric(6)}`;
  const reasonCode2 = `abuse_${RandomGenerator.alphaNumeric(6)}`;

  const reasonCreateBody1 = {
    code: reasonCode1,
    name: "Spam",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;
  const reasonCreateBody2 = {
    code: reasonCode2,
    name: "Abuse",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reasonCategory1: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: reasonCreateBody1,
      },
    );
  const reasonCategory2: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: reasonCreateBody2,
      },
    );
  typia.assert(reasonCategory1);
  typia.assert(reasonCategory2);

  // 4. Create member user, then authenticate as memberUser
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.test`,
    password: "MemberPass123!",
    ip: "127.0.0.2",
    href: "https://platform.test/member/join",
    referrer: "https://platform.test/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. As memberUser, create a community referencing the visibility level code
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. As memberUser, create multiple reports with different severities & reason categories in same community
  const severities = ["low", "high"] as const;
  const createdReportIdsForReason1: string[] = [];
  const createdReportIdsForReason2: string[] = [];

  const createReport = async (
    categoryId: string & tags.Format<"uuid">,
    severity: string | null,
  ): Promise<ICommunityPlatformReport> => {
    const body = {
      reporter_type: "member",
      report_reason_category_id: categoryId,
      community_id: community.id,
      severity,
      description: RandomGenerator.paragraph({ sentences: 10 }),
    } satisfies ICommunityPlatformReport.ICreate;
    const report: ICommunityPlatformReport =
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        { body },
      );
    typia.assert(report);
    return report;
  };

  // Seed at least 3 reports for reasonCategory1 with high severity
  const report1 = await createReport(reasonCategory1.id, "high");
  const report2 = await createReport(reasonCategory1.id, "high");
  const report3 = await createReport(reasonCategory1.id, "low");
  createdReportIdsForReason1.push(report1.id, report2.id, report3.id);

  // Seed at least 2 reports for reasonCategory2 with contrasting severities
  const report4 = await createReport(reasonCategory2.id, "high");
  const report5 = await createReport(reasonCategory2.id, "low");
  createdReportIdsForReason2.push(report4.id, report5.id);

  // 7. Create community moderator account and ensure communityModerator auth
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@moderator.test`,
    password: "ModeratorPass123!",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.3",
    href: "https://platform.test/moderator/join",
    referrer: "https://platform.test/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;
  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 8. As communityModerator, search for reports filtered by community, reasonCategory1 and high severity
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const pageSize = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const searchBodyForReason1High = {
    page,
    pageSize,
    statuses: undefined,
    reporter_types: undefined,
    severity_levels: ["high"],
    community_ids: [community.id],
    reason_category_ids: [reasonCategory1.id],
    created_from: undefined,
    created_to: undefined,
    resolved_from: undefined,
    resolved_to: undefined,
    description_query: undefined,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformReport.IRequest;

  const pageForReason1High: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.communityModerator.search.reports.index(
      connection,
      {
        body: searchBodyForReason1High,
      },
    );
  typia.assert(pageForReason1High);

  const pagination1 = pageForReason1High.pagination;
  const data1 = pageForReason1High.data;

  TestValidator.equals(
    "pagination current equals requested page",
    pagination1.current,
    page,
  );
  TestValidator.equals(
    "pagination limit equals requested pageSize",
    pagination1.limit,
    pageSize,
  );
  TestValidator.predicate(
    "records should be >= returned data length",
    pagination1.records >= data1.length,
  );
  TestValidator.predicate("pages should be >= 0", pagination1.pages >= 0);

  for (const summary of data1) {
    typia.assert<ICommunityPlatformReport.ISummary>(summary);

    TestValidator.predicate(
      "summary status is non-empty",
      summary.status.length > 0,
    );
    TestValidator.predicate(
      "summary targetType is non-empty",
      summary.targetType.length > 0,
    );
    TestValidator.equals(
      "filtered reasonCategory id must be reasonCategory1.id",
      summary.reasonCategory.id,
      reasonCategory1.id,
    );
    TestValidator.predicate(
      "reporter id should be defined",
      summary.reporter.id.length > 0,
    );
  }

  // 9. Second search: same filters but reasonCategory2 to verify different result set
  const searchBodyForReason2High = {
    page,
    pageSize,
    statuses: undefined,
    reporter_types: undefined,
    severity_levels: ["high"],
    community_ids: [community.id],
    reason_category_ids: [reasonCategory2.id],
    created_from: undefined,
    created_to: undefined,
    resolved_from: undefined,
    resolved_to: undefined,
    description_query: undefined,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformReport.IRequest;

  const pageForReason2High: IPageICommunityPlatformReport.ISummary =
    await api.functional.communityPlatform.communityModerator.search.reports.index(
      connection,
      {
        body: searchBodyForReason2High,
      },
    );
  typia.assert(pageForReason2High);

  const pagination2 = pageForReason2High.pagination;
  const data2 = pageForReason2High.data;

  TestValidator.equals(
    "pagination2 current equals requested page",
    pagination2.current,
    page,
  );
  TestValidator.equals(
    "pagination2 limit equals requested pageSize",
    pagination2.limit,
    pageSize,
  );
  TestValidator.predicate(
    "pagination2 records should be >= returned data length",
    pagination2.records >= data2.length,
  );

  for (const summary of data2) {
    typia.assert<ICommunityPlatformReport.ISummary>(summary);
    TestValidator.equals(
      "filtered reasonCategory id must be reasonCategory2.id",
      summary.reasonCategory.id,
      reasonCategory2.id,
    );
  }

  // 10. If both result sets have data, ensure they are not identical and don't mix categories
  if (data1.length > 0 && data2.length > 0) {
    const ids1 = data1.map((s) => s.id);
    const ids2 = data2.map((s) => s.id);

    TestValidator.predicate(
      "result sets for different reason categories should not be identical",
      ids1.some((id) => !ids2.includes(id)) ||
        ids2.some((id) => !ids1.includes(id)),
    );
  }
}
