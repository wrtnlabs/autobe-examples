import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberWarning";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberWarning";

export async function test_api_member_warnings_filter_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create member account for warning records
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create a warning (will have server-assigned createdAt timestamp)
  const reportDecisionId = typia.random<string & tags.Format<"uuid">>();
  const warning1 =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member.id,
          communityPlatformReportDecisionId: reportDecisionId,
          violationCategory: "spam",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning1);

  // Step 4: Create additional warnings to test filtering
  const warning2 =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member.id,
          communityPlatformReportDecisionId: reportDecisionId,
          violationCategory: "harassment",
          warningCount: 2,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning2);

  // Step 5: Get the date range from created warnings
  const warning1Date = new Date(warning1.createdAt);
  const warning2Date = new Date(warning2.createdAt);

  // Create date range that encompasses both warnings (with buffer)
  const startDate = new Date(warning1Date.getTime() - 1000 * 60).toISOString();
  const endDate = new Date(warning2Date.getTime() + 1000 * 60).toISOString();
  const beforeWarnings = new Date(
    warning1Date.getTime() - 1000 * 60 * 60,
  ).toISOString();
  const afterWarnings = new Date(
    warning2Date.getTime() + 1000 * 60 * 60,
  ).toISOString();

  // Step 6: Test filtering with both start and end dates
  const rangeResults =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          createdDateFrom: startDate,
          createdDateTo: endDate,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(rangeResults);
  TestValidator.predicate(
    "date range filter with both dates should return warnings within range",
    rangeResults.data.length >= 2,
  );

  // Step 7: Test filtering with only start date
  const startOnlyResults =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          createdDateFrom: startDate,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(startOnlyResults);
  TestValidator.predicate(
    "date filter with only start date should return warnings on or after that date",
    startOnlyResults.data.length >= 2,
  );

  // Step 8: Test filtering with only end date
  const endOnlyResults =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          createdDateTo: endDate,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(endOnlyResults);
  TestValidator.predicate(
    "date filter with only end date should return warnings on or before that date",
    endOnlyResults.data.length >= 2,
  );

  // Step 9: Test filtering with date range before all warnings
  const beforeResults =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          createdDateFrom: new Date(beforeWarnings).toISOString(),
          createdDateTo: new Date(
            warning1Date.getTime() - 1000 * 60 * 30,
          ).toISOString(),
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(beforeResults);

  // Step 10: Test filtering with date range after all warnings
  const afterResults =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          createdDateFrom: new Date(
            warning2Date.getTime() + 1000 * 60 * 30,
          ).toISOString(),
          createdDateTo: afterWarnings,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(afterResults);

  // Step 11: Test with boundary date (start date equals warning creation)
  const boundaryStartResults =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          createdDateFrom: warning1.createdAt,
          createdDateTo: warning2.createdAt,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(boundaryStartResults);
  TestValidator.predicate(
    "warnings created exactly on boundary dates should be included",
    boundaryStartResults.data.length >= 2,
  );

  // Step 12: Test member ID filtering combined with date range
  const memberFilteredResults =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          memberId: member.id,
          createdDateFrom: startDate,
          createdDateTo: endDate,
        } satisfies ICommunityPlatformMemberWarning.IRequest,
      },
    );
  typia.assert(memberFilteredResults);
  TestValidator.predicate(
    "all results should be for the specified member",
    memberFilteredResults.data.every((w) => w.member.id === member.id),
  );

  // Step 13: Verify pagination information is returned
  TestValidator.equals(
    "pagination limit should match request",
    memberFilteredResults.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    memberFilteredResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination should show total records",
    memberFilteredResults.pagination.records >= 0,
  );
}
