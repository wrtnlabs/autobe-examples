import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportReasonCategory";

/**
 * Basic paginated search over report reason categories for a platform admin.
 *
 * Business flow validated by this test:
 *
 * 1. A new platform admin account is created via POST /auth/platformAdmin/join.
 *    The SDK automatically attaches the returned JWT access token to the
 *    connection so that subsequent calls are authenticated as this admin.
 * 2. Using the authenticated platform admin connection, the test seeds several
 *    report reason categories through POST
 *    /communityPlatform/platformAdmin/reportReasonCategories, providing
 *    ICommunityPlatformReportReasonCategory.ICreate payloads with distinct
 *    codes and realistic names/descriptions, as well as varying is_user_visible
 *    and is_active flags.
 * 3. It then calls PATCH /communityPlatform/platformAdmin/reportReasonCategories
 *    with an ICommunityPlatformReportReasonCategory.IRequest body that
 *    specifies a small pageSize (e.g., 2) and a deterministic sortBy ("code")
 *    with sortDirection "asc" so that pagination order is stable.
 * 4. The response must be an IPageICommunityPlatformReportReasonCategory.ISummary
 *    envelope, so the test validates pagination.current, pagination.limit,
 *    pagination.records, and pagination.pages against the number of seeded
 *    categories and the requested page size.
 * 5. The test verifies that the first page’s data array contains up to pageSize
 *    summaries ordered by code ascending, that each summary’s core fields
 *    (code, name, description, is_user_visible, is_active) match the seeded
 *    entities, and that the IDs in the page are a subset of the seeded
 *    records.
 * 6. If more than pageSize categories were seeded, the test issues a second PATCH
 *    request for the next page (page = 1) with the same sort parameters and
 *    asserts that:
 *
 *    - The second page’s items are disjoint from the first page’s items; and
 *    - Combining page 0 and page 1 yields only IDs present in the seeded categories.
 */
export async function test_api_report_reason_categories_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and obtain authenticated connection
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Seed multiple report reason categories with distinct codes
  const seedCodes = [
    "spam",
    "harassment",
    "illegal_content",
    "off_topic",
  ] as const;

  const createPayloads: ICommunityPlatformReportReasonCategory.ICreate[] =
    seedCodes.map((code, index) => {
      const visible = index % 2 === 0;
      const active = index !== 1; // make at least one inactive
      return {
        code,
        name: `Reason ${code}`,
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        is_user_visible: visible,
        is_active: active,
      } satisfies ICommunityPlatformReportReasonCategory.ICreate;
    });

  const createdCategories: ICommunityPlatformReportReasonCategory[] = [];
  for (const payload of createPayloads) {
    const created =
      await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
        connection,
        { body: payload },
      );
    typia.assert(created);
    createdCategories.push(created);
  }

  // Sort locally by code ascending for later comparison
  const sortedByCode = [...createdCategories].sort((a, b) =>
    a.code.localeCompare(b.code),
  );

  const pageSize = 2;

  // 3. Call index endpoint for the first page (page = 0)
  const firstRequestBody = {
    page: 0,
    pageSize,
    sortBy: "code",
    sortDirection: "asc",
  } satisfies ICommunityPlatformReportReasonCategory.IRequest;

  const firstPage: IPageICommunityPlatformReportReasonCategory.ISummary =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.index(
      connection,
      { body: firstRequestBody },
    );
  typia.assert(firstPage);

  const paginationFirst = firstPage.pagination;
  typia.assert<IPage.IPagination>(paginationFirst);

  // 4. Validate pagination metadata for the first page
  TestValidator.equals(
    "pagination.limit matches requested pageSize",
    paginationFirst.limit,
    pageSize,
  );

  TestValidator.equals(
    "pagination.current is 1-based index for the first page",
    paginationFirst.current,
    1,
  );

  const totalSeeded = sortedByCode.length;
  TestValidator.predicate(
    "pagination.records is at least number of seeded categories",
    paginationFirst.records >= totalSeeded,
  );

  TestValidator.predicate(
    "pagination.pages is positive when there are records",
    paginationFirst.records === 0
      ? paginationFirst.pages === 0
      : paginationFirst.pages >= 1,
  );

  // 5. Validate first page contents and ordering
  const firstData = firstPage.data;
  TestValidator.predicate(
    "first page has at most pageSize items",
    firstData.length <= pageSize,
  );

  const firstCodes = firstData.map((c) => c.code);
  const sortedFirstCodes = [...firstCodes].sort((a, b) => a.localeCompare(b));
  TestValidator.equals(
    "first page codes are sorted ascending by code",
    firstCodes,
    sortedFirstCodes,
  );

  const createdById = new Map(sortedByCode.map((c) => [c.id, c] as const));

  for (const summary of firstData) {
    const original = createdById.get(summary.id);
    TestValidator.predicate(
      "summary id exists among created categories",
      original !== undefined,
    );
    if (original) {
      TestValidator.equals(
        "summary.code matches original",
        summary.code,
        original.code,
      );
      TestValidator.equals(
        "summary.name matches original",
        summary.name,
        original.name,
      );
      TestValidator.equals(
        "summary.description matches original",
        summary.description,
        original.description,
      );
      TestValidator.equals(
        "summary.is_user_visible matches original",
        summary.is_user_visible,
        original.is_user_visible,
      );
      TestValidator.equals(
        "summary.is_active matches original",
        summary.is_active,
        original.is_active,
      );
    }
  }

  // 6. Optionally fetch second page and ensure no overlap and full coverage
  if (paginationFirst.pages > 1) {
    const secondRequestBody = {
      page: 1,
      pageSize,
      sortBy: "code",
      sortDirection: "asc",
    } satisfies ICommunityPlatformReportReasonCategory.IRequest;

    const secondPage: IPageICommunityPlatformReportReasonCategory.ISummary =
      await api.functional.communityPlatform.platformAdmin.reportReasonCategories.index(
        connection,
        { body: secondRequestBody },
      );
    typia.assert(secondPage);

    const secondData = secondPage.data;
    TestValidator.predicate(
      "second page has at most pageSize items",
      secondData.length <= pageSize,
    );

    const firstIds = new Set(firstData.map((c) => c.id));
    for (const summary of secondData) {
      TestValidator.predicate(
        "no overlap between first and second page ids",
        !firstIds.has(summary.id),
      );
    }

    const combinedIds = new Set<string>([...firstIds]);
    for (const s of secondData) combinedIds.add(s.id);
    const seededIds = new Set(sortedByCode.map((c) => c.id));

    for (const id of combinedIds) {
      TestValidator.predicate(
        "paged id is subset of seeded ids",
        seededIds.has(id),
      );
    }
  }
}
