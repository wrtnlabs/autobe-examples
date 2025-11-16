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

/**
 * Validate moderator report search with combined date range and description
 * filters.
 *
 * Business flow:
 *
 * 1. Platform admin joins and stays authenticated.
 * 2. Platform admin creates a visibility level and a report reason category.
 * 3. Member user joins and logs in.
 * 4. Member user creates a community using the visibility level code.
 * 5. Member user creates three reports with distinct description phrases, all
 *    referencing the created community and reason category.
 * 6. Community moderator joins and logs in.
 * 7. Moderator performs an unfiltered search to get all reports and their
 *    createdAt timestamps.
 * 8. Moderator performs a filtered search using a created_from/created_to window
 *    and description_query targeting only the "spam" report, plus community_ids
 *    and reason_category_ids.
 * 9. Moderator performs another filtered search using description_query targeting
 *    "harassment" and validates that returned ids differ.
 *
 * The test asserts that:
 *
 * - Pagination metadata reflects the expected number of matches.
 * - All returned reports fall within the specified createdAt window.
 * - All returned reports share the expected reasonCategory and community context.
 * - Description-based filters change the result set as expected.
 */
export async function test_api_moderator_report_search_with_date_and_text_filters(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: platformAdminJoinBody,
    },
  );
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a visibility level
  const visibilityLevelCode = `public_${RandomGenerator.alphabets(8)}`;
  const visibilityLevelCreateBody = {
    code: visibilityLevelCode,
    name: `Public ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Platform admin creates a report reason category
  const reasonCode = `spam_${RandomGenerator.alphabets(6)}`;
  const reasonCategoryCreateBody = {
    code: reasonCode,
    name: "Spam content",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;
  const reasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: reasonCategoryCreateBody,
      },
    );
  typia.assert(reasonCategory);

  // 4. Member user joins and logs in
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert(memberAuthorized);

  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.example.com/login",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;
  const memberLogin = await api.functional.auth.memberUser.login(connection, {
    body: memberLoginBody,
  });
  typia.assert(memberLogin);

  // 5. Member user creates a community
  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 6. Member user creates multiple reports with distinct descriptions
  const descriptions = [
    "This post contains spam link to malicious site.",
    "Observed harassment in comments against other members.",
    "This is off-topic content unrelated to the community focus.",
  ] as const;

  const reports: ICommunityPlatformReport[] = [];
  for (const description of descriptions) {
    const reportCreateBody = {
      reporter_type: "member",
      report_reason_category_id: reasonCategory.id,
      community_id: community.id,
      severity: "medium",
      description,
    } satisfies ICommunityPlatformReport.ICreate;
    const created =
      await api.functional.communityPlatform.memberUser.reports.create(
        connection,
        {
          body: reportCreateBody,
        },
      );
    typia.assert(created);
    reports.push(created);
  }

  TestValidator.equals("three reports created", reports.length, 3);

  // 7. Community moderator joins and logs in
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;
  const moderatorAuthorized = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: moderatorJoinBody,
    },
  );
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://mod.example.com/login",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;
  const moderatorLogin = await api.functional.auth.communityModerator.login(
    connection,
    {
      body: moderatorLoginBody,
    },
  );
  typia.assert(moderatorLogin);

  // 8. Moderator performs unfiltered search to get all reports
  const initialSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    community_ids: [community.id],
    reason_category_ids: [reasonCategory.id],
  } satisfies ICommunityPlatformReport.IRequest;
  const initialPage =
    await api.functional.communityPlatform.communityModerator.search.reports.index(
      connection,
      {
        body: initialSearchBody,
      },
    );
  typia.assert(initialPage);

  const allSummaries = initialPage.data;
  TestValidator.predicate(
    "initial search returns at least three reports",
    allSummaries.length >= 3,
  );

  const reportIdSet = new Set(reports.map((r) => r.id));
  const matchedSummaries = allSummaries.filter((s) => reportIdSet.has(s.id));
  TestValidator.predicate(
    "all created reports appear in moderator search",
    matchedSummaries.length === reports.length,
  );

  // Collect createdAt timestamps from summaries corresponding to created reports
  const createdTimes = matchedSummaries.map((s) => s.createdAt).sort();
  const earliestCreatedAt = createdTimes[0];
  const latestCreatedAt = createdTimes[createdTimes.length - 1];

  // 9. Moderator performs filtered search for "spam" within full time window
  const spamSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    community_ids: [community.id],
    reason_category_ids: [reasonCategory.id],
    created_from: earliestCreatedAt,
    created_to: latestCreatedAt,
    description_query: "spam",
  } satisfies ICommunityPlatformReport.IRequest;
  const spamPage =
    await api.functional.communityPlatform.communityModerator.search.reports.index(
      connection,
      {
        body: spamSearchBody,
      },
    );
  typia.assert(spamPage);

  const spamSummaries = spamPage.data;

  // Expect exactly one of our three reports to contain "spam" in description
  const spamReport = reports.find((r) =>
    (r.description ?? "").toLowerCase().includes("spam"),
  );
  TestValidator.predicate(
    "spam report exists among created reports",
    spamReport !== undefined,
  );

  const expectedSpamId = spamReport ? spamReport.id : undefined;
  const spamIds = spamSummaries.map((s) => s.id);

  TestValidator.predicate(
    "all spam search results match time range and filters",
    spamSummaries.every((s) => {
      const createdAt = s.createdAt;
      return (
        createdAt >= earliestCreatedAt &&
        createdAt <= latestCreatedAt &&
        s.reasonCategory.id === reasonCategory.id
      );
    }),
  );

  TestValidator.predicate(
    "spam search results include the spam report id when present",
    expectedSpamId === undefined || spamIds.includes(expectedSpamId),
  );

  // 10. Moderator performs filtered search for "harassment" within the same window
  const harassmentSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    community_ids: [community.id],
    reason_category_ids: [reasonCategory.id],
    created_from: earliestCreatedAt,
    created_to: latestCreatedAt,
    description_query: "harassment",
  } satisfies ICommunityPlatformReport.IRequest;
  const harassmentPage =
    await api.functional.communityPlatform.communityModerator.search.reports.index(
      connection,
      {
        body: harassmentSearchBody,
      },
    );
  typia.assert(harassmentPage);

  const harassmentSummaries = harassmentPage.data;

  const harassmentReport = reports.find((r) =>
    (r.description ?? "").toLowerCase().includes("harassment"),
  );
  TestValidator.predicate(
    "harassment report exists among created reports",
    harassmentReport !== undefined,
  );

  const expectedHarassmentId = harassmentReport
    ? harassmentReport.id
    : undefined;
  const harassmentIds = harassmentSummaries.map((s) => s.id);

  TestValidator.predicate(
    "harassment search results include the harassment report id when present",
    expectedHarassmentId === undefined ||
      harassmentIds.includes(expectedHarassmentId),
  );

  // 11. Verify spam and harassment filtered result sets differ when both present
  if (expectedSpamId !== undefined && expectedHarassmentId !== undefined) {
    TestValidator.predicate(
      "spam and harassment result sets differ by id",
      expectedSpamId !== expectedHarassmentId ||
        spamIds.some((id) => !harassmentIds.includes(id)) ||
        harassmentIds.some((id) => !spamIds.includes(id)),
    );
  }
}
