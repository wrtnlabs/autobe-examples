import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationCase";

export async function test_api_moderation_case_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin authentication: join as a new adminUser so that we can create moderation cases.
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "AdminPassword123!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed 10 moderation cases with varying title, status, priority, and case_key.
  const totalCases = 10;
  const createdCases: ICommunityPlatformModerationCase[] =
    await ArrayUtil.asyncRepeat(totalCases, async (index) => {
      const caseKey = `CASE-${index + 1}-${RandomGenerator.alphaNumeric(6)}`;
      const title = RandomGenerator.paragraph({ sentences: 3 });

      const statuses = ["open", "in_review", "resolved"] as const;
      const priorities = ["low", "medium", "high", "urgent"] as const;

      const status = RandomGenerator.pick(statuses);
      const priority = RandomGenerator.pick(priorities);

      const body = {
        case_key: caseKey,
        title,
        description: RandomGenerator.content({ paragraphs: 1 }),
        status,
        priority,
        assigned_adminuser_id: index % 2 === 0 ? adminAuthorized.id : null,
      } satisfies ICommunityPlatformModerationCase.ICreate;

      const created =
        await api.functional.communityPlatform.adminUser.moderationCases.create(
          connection,
          { body },
        );
      typia.assert(created);
      return created;
    });

  // For deterministic expectation, sort the createdCases array in-memory using created_at descending,
  // which should match the backend's sortField="created_at" and sortOrder="desc" behavior.
  const sortedByCreatedDesc = [...createdCases].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );

  // 3. First-page search with page=1, limit=5, sortField="created_at", sortOrder="desc".
  const firstPageRequest = {
    page: 1,
    limit: 5,
    sortField: "created_at",
    sortOrder: "desc",
  } satisfies ICommunityPlatformModerationCase.IRequest;

  const firstPage: IPageICommunityPlatformModerationCase.ISummary =
    await api.functional.communityPlatform.adminUser.moderation.search.cases.index(
      connection,
      { body: firstPageRequest },
    );
  typia.assert(firstPage);

  // 4. Second-page search with page=2, same sort configuration.
  const secondPageRequest = {
    page: 2,
    limit: 5,
    sortField: "created_at",
    sortOrder: "desc",
  } satisfies ICommunityPlatformModerationCase.IRequest;

  const secondPage: IPageICommunityPlatformModerationCase.ISummary =
    await api.functional.communityPlatform.adminUser.moderation.search.cases.index(
      connection,
      { body: secondPageRequest },
    );
  typia.assert(secondPage);

  // 5. Assertions on pagination meta for both responses.
  const totalRecords: number = firstPage.pagination.records;

  TestValidator.equals(
    "first page current should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "second page current should be 2",
    secondPage.pagination.current,
    2,
  );

  TestValidator.equals(
    "first page limit should be 5",
    firstPage.pagination.limit,
    5,
  );
  TestValidator.equals(
    "second page limit should be 5",
    secondPage.pagination.limit,
    5,
  );

  TestValidator.predicate(
    "total records should be at least number of created cases",
    totalRecords >= createdCases.length,
  );

  TestValidator.equals(
    "pagination records should be stable across pages",
    secondPage.pagination.records,
    totalRecords,
  );

  // Pages should equal ceil(totalRecords / limit).
  const expectedPages = Math.ceil(totalRecords / firstPage.pagination.limit);
  TestValidator.equals(
    "pages should match records/limit",
    firstPage.pagination.pages,
    expectedPages,
  );
  TestValidator.equals(
    "pages should be consistent across responses",
    secondPage.pagination.pages,
    expectedPages,
  );

  // 6. Non-overlapping results between page 1 and 2.
  const firstIds = firstPage.data.map((c) => c.id);
  const secondIds = secondPage.data.map((c) => c.id);

  const overlap = firstIds.filter((id) => secondIds.includes(id));
  TestValidator.equals(
    "no overlapping moderation case IDs between page 1 and page 2",
    overlap.length,
    0,
  );

  // 7. Union of page 1 and 2 IDs corresponds to top 10 sorted cases.
  const unionIds = [...firstIds, ...secondIds];

  const expectedTopTenIds = sortedByCreatedDesc
    .slice(0, Math.min(10, sortedByCreatedDesc.length))
    .map((c) => c.id);

  // Because the search endpoint may include other pre-existing cases,
  // we only assert that all our seeded top 10 IDs appear within unionIds.
  const missingFromResults = expectedTopTenIds.filter(
    (id) => !unionIds.includes(id),
  );

  TestValidator.equals(
    "all seeded top 10 cases by created_at desc should appear in first two pages",
    missingFromResults.length,
    0,
  );

  // 8. Ordering within each page: data[i].created_at should be >= data[i+1].created_at.
  const assertPageSortedDesc = (
    title: string,
    cases: ICommunityPlatformModerationCase.ISummary[],
  ) => {
    for (let i = 0; i < cases.length - 1; i++) {
      const current = cases[i];
      const next = cases[i + 1];
      TestValidator.predicate(
        `${title} created_at must be non-increasing at index ${i}`,
        current.created_at >= next.created_at,
      );
    }
  };

  assertPageSortedDesc("first page cases", firstPage.data);
  assertPageSortedDesc("second page cases", secondPage.data);

  // 9. Edge page behavior: page beyond total pages should return empty data array.
  const outOfRangePage = expectedPages + 1;
  const outOfRangeRequest = {
    page: outOfRangePage,
    limit: firstPage.pagination.limit,
    sortField: "created_at",
    sortOrder: "desc",
  } satisfies ICommunityPlatformModerationCase.IRequest;

  const outOfRangeResult: IPageICommunityPlatformModerationCase.ISummary =
    await api.functional.communityPlatform.adminUser.moderation.search.cases.index(
      connection,
      { body: outOfRangeRequest },
    );
  typia.assert(outOfRangeResult);

  TestValidator.equals(
    "out-of-range page current should equal requested page",
    outOfRangeResult.pagination.current,
    outOfRangePage,
  );
  TestValidator.equals(
    "out-of-range pagination records should equal totalRecords",
    outOfRangeResult.pagination.records,
    totalRecords,
  );
  TestValidator.equals(
    "out-of-range pagination pages should equal expectedPages",
    outOfRangeResult.pagination.pages,
    expectedPages,
  );

  TestValidator.equals(
    "out-of-range page data should be empty",
    outOfRangeResult.data.length,
    0,
  );
}
