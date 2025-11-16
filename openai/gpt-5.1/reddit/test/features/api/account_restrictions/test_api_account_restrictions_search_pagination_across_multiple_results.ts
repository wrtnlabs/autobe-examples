import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAccountRestriction";

/**
 * Validate pagination and sorting across multiple pages of adminUser account
 * restriction search.
 *
 * Business context: Administrative moderation tools need to reliably page
 * through large sets of account restriction episodes. This test verifies that
 * the search endpoint for adminUser accountRestrictions returns stable
 * ordering, correct pagination metadata, and non-duplicated results across
 * multiple pages when many restriction episodes exist.
 *
 * Scenario steps:
 *
 * 1. Join an adminUser account to obtain an authenticated admin context.
 * 2. Create more restriction episodes than can fit in a single page (e.g., N > 3 *
 *    limit) using the admin context.
 * 3. Fetch page 1 with a fixed limit and sort order (created_at desc).
 * 4. Fetch page 2 with the same limit and sort order.
 * 5. Optionally fetch page 3 when the pagination metadata reports at least 3
 *    pages.
 * 6. Validate:
 *
 *    - Pagination metadata (current, limit, records, pages).
 *    - No duplicate restriction IDs across pages.
 *    - Stable global ordering by created_at across concatenated pages.
 */
export async function test_api_account_restrictions_search_pagination_across_multiple_results(
  connection: api.IConnection,
) {
  // 1. Join an adminUser to obtain admin authentication context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create many restriction episodes (N > 3 * limit)
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const totalRestrictions = limit * 3 + 5;

  const created: ICommunityPlatformAccountRestriction[] = [];

  for (let i = 0; i < totalRestrictions; i++) {
    // Use descending starts_at timestamps by slightly offsetting current time
    const now = new Date();
    const startsAt = new Date(now.getTime() - i * 1_000).toISOString();

    const body = {
      account_type: "adminUser",
      scope: "full",
      reason_category: RandomGenerator.pick([
        "abuse",
        "spam",
        "policy_violation",
        "security",
      ] as const),
      reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
      starts_at: startsAt,
      ends_at: null,
    } satisfies ICommunityPlatformAccountRestriction.ICreate;

    const createdRestriction: ICommunityPlatformAccountRestriction =
      await api.functional.communityPlatform.adminUser.accountRestrictions.create(
        connection,
        { body },
      );
    typia.assert<ICommunityPlatformAccountRestriction>(createdRestriction);
    created.push(createdRestriction);
  }

  // 3. Build a base search request with neutral filters
  const requestBase = {
    subject_username: null,
    subject_type: null,
    restriction_type: null,
    is_active: null,
    effective_from_gte: null,
    effective_from_lte: null,
    effective_until_gte: null,
    effective_until_lte: null,
    reason_category: null,
    created_at_gte: null,
    created_at_lte: null,
  } satisfies Omit<
    ICommunityPlatformAccountRestriction.IRequest,
    "page" | "limit" | "sort_by" | "sort_direction"
  >;

  // 3. Fetch page 1 with sort_by created_at desc
  const page1Body: ICommunityPlatformAccountRestriction.IRequest = {
    ...requestBase,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    sort_by: "created_at",
    sort_direction: "desc",
  };

  const page1: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.accountRestrictions.index(
      connection,
      { body: page1Body },
    );
  typia.assert<IPageICommunityPlatformAccountRestriction.ISummary>(page1);

  TestValidator.equals(
    "page 1 current index matches request",
    page1.pagination.current,
    page1Body.page,
  );
  TestValidator.equals(
    "page 1 limit matches request",
    page1.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "page 1 items count must be <= limit",
    page1.data.length <= limit,
  );

  // 4. Fetch page 2 with the same filters and order
  const page2Body: ICommunityPlatformAccountRestriction.IRequest = {
    ...requestBase,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
    sort_by: "created_at",
    sort_direction: "desc",
  };

  const page2: IPageICommunityPlatformAccountRestriction.ISummary =
    await api.functional.communityPlatform.adminUser.accountRestrictions.index(
      connection,
      { body: page2Body },
    );
  typia.assert<IPageICommunityPlatformAccountRestriction.ISummary>(page2);

  TestValidator.equals(
    "page 2 current index matches request",
    page2.pagination.current,
    page2Body.page,
  );
  TestValidator.equals(
    "page 2 limit matches request",
    page2.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "page 2 items count must be <= limit",
    page2.data.length <= limit,
  );

  // 5. Optionally fetch page 3 if pagination reports at least 3 pages
  let page3: IPageICommunityPlatformAccountRestriction.ISummary | null = null;
  if (page1.pagination.pages >= 3) {
    const page3Body: ICommunityPlatformAccountRestriction.IRequest = {
      ...requestBase,
      page: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit,
      sort_by: "created_at",
      sort_direction: "desc",
    };

    const result3: IPageICommunityPlatformAccountRestriction.ISummary =
      await api.functional.communityPlatform.adminUser.accountRestrictions.index(
        connection,
        { body: page3Body },
      );
    typia.assert<IPageICommunityPlatformAccountRestriction.ISummary>(result3);

    TestValidator.equals(
      "page 3 current index matches request",
      result3.pagination.current,
      page3Body.page,
    );
    TestValidator.equals(
      "page 3 limit matches request",
      result3.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "page 3 items count must be <= limit",
      result3.data.length <= limit,
    );

    page3 = result3;
  }

  // 6. Verify no duplicate IDs across all fetched pages
  const pages = page3 === null ? [page1, page2] : [page1, page2, page3];
  const ids = pages.flatMap((page) => page.data.map((summary) => summary.id));
  const uniqueIds = Array.from(new Set(ids));

  TestValidator.equals(
    "no duplicate restriction IDs across fetched pages",
    uniqueIds.length,
    ids.length,
  );

  // 7. Verify global ordering by created_at desc across concatenated pages
  const concatenated = pages.flatMap((page) => page.data);
  for (let i = 1; i < concatenated.length; i++) {
    const prev = concatenated[i - 1];
    const curr = concatenated[i];

    const prevCreated = new Date(prev.created_at).getTime();
    const currCreated = new Date(curr.created_at).getTime();

    TestValidator.predicate(
      `created_at must be non-increasing across pages at index ${i}`,
      prevCreated >= currCreated,
    );
  }

  // 8. Sanity: total records from pagination should be at least created count
  TestValidator.predicate(
    "pagination.records should be >= number of created restrictions",
    page1.pagination.records >= created.length,
  );
}
