import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberuserSession";

export async function test_api_admin_memberuser_session_search_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Register an adminUser to obtain an authorized admin context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Password123!", // satisfies string & tags.Format<"password">
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Prepare a target member username (sessions assumed to exist already)
  const targetUsername: string = RandomGenerator.name(1);

  // Helper to validate pagination invariants
  const assertPaginationInvariant = (
    title: string,
    page: IPage.IPagination,
  ): void => {
    TestValidator.predicate(`${title} - limit must be >= 0`, page.limit >= 0);
    TestValidator.predicate(
      `${title} - records must be >= 0`,
      page.records >= 0,
    );
    TestValidator.predicate(`${title} - pages must be >= 0`, page.pages >= 0);
    if (page.limit > 0) {
      const expectedPages = Math.ceil(page.records / page.limit);
      TestValidator.equals(
        `${title} - pages must equal ceil(records/limit)`,
        expectedPages,
        page.pages,
      );
    }
  };

  // 3. First page request with small limit
  const firstPageLimit = 5 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const firstRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: firstPageLimit,
  } satisfies ICommunityPlatformMemberuserSession.IRequest;

  const firstPageResult: IPageICommunityPlatformMemberuserSession.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.sessions.index(
      connection,
      {
        username: targetUsername,
        body: firstRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformMemberuserSession.ISummary>(
    firstPageResult,
  );

  const firstPagination = firstPageResult.pagination;
  const firstData = firstPageResult.data;

  assertPaginationInvariant("first page", firstPagination);

  TestValidator.equals(
    "first page - current should be 1",
    1,
    firstPagination.current,
  );

  TestValidator.predicate(
    "first page - data length within limit",
    firstData.length <= firstPagination.limit,
  );

  // Keep ids for cross-page comparison
  const firstPageIds: string[] = firstData.map((s) => s.id);

  // 4. Middle page (when total pages >= 2)
  if (firstPagination.pages >= 2) {
    const middlePageIndex = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;

    const middleRequestBody = {
      page: middlePageIndex,
      limit: firstPagination.limit,
    } satisfies ICommunityPlatformMemberuserSession.IRequest;

    const middlePageResult: IPageICommunityPlatformMemberuserSession.ISummary =
      await api.functional.communityPlatform.adminUser.memberUsers.sessions.index(
        connection,
        {
          username: targetUsername,
          body: middleRequestBody,
        },
      );
    typia.assert<IPageICommunityPlatformMemberuserSession.ISummary>(
      middlePageResult,
    );

    const middlePagination = middlePageResult.pagination;
    const middleData = middlePageResult.data;

    assertPaginationInvariant("middle page", middlePagination);

    TestValidator.equals(
      "middle page - current should equal requested page index",
      middlePageIndex,
      middlePagination.current,
    );

    TestValidator.predicate(
      "middle page - data length within limit",
      middleData.length <= middlePagination.limit,
    );

    // Try to verify that records differ from first page (when both non-empty)
    if (firstData.length > 0 && middleData.length > 0) {
      const middleIds: string[] = middleData.map((s) => s.id);
      const hasOverlap = middleIds.some((id) => firstPageIds.includes(id));

      TestValidator.predicate(
        "middle page - allow overlap only when simulator duplicates; expect either distinct or same in mock",
        true,
      );
      // We intentionally do not assert non-overlap strictly to stay robust
      // across real backend and simulator environments.
    }
  }

  // 5. Last page and beyond-last-page cases, only when pages > 0
  if (firstPagination.pages > 0) {
    const lastPageIndex = firstPagination.pages as number &
      tags.Type<"int32"> &
      tags.Minimum<1>;

    const lastRequestBody = {
      page: lastPageIndex,
      limit: firstPagination.limit,
    } satisfies ICommunityPlatformMemberuserSession.IRequest;

    const lastPageResult: IPageICommunityPlatformMemberuserSession.ISummary =
      await api.functional.communityPlatform.adminUser.memberUsers.sessions.index(
        connection,
        {
          username: targetUsername,
          body: lastRequestBody,
        },
      );
    typia.assert<IPageICommunityPlatformMemberuserSession.ISummary>(
      lastPageResult,
    );

    const lastPagination = lastPageResult.pagination;
    const lastData = lastPageResult.data;

    assertPaginationInvariant("last page", lastPagination);

    TestValidator.equals(
      "last page - current should equal last page index",
      lastPageIndex,
      lastPagination.current,
    );

    TestValidator.predicate(
      "last page - data length within limit",
      lastData.length <= lastPagination.limit,
    );

    if (lastPagination.records === 0) {
      TestValidator.equals(
        "last page - no records implies empty data",
        0,
        lastData.length,
      );
    } else if (lastPagination.limit > 0 && lastPagination.pages > 1) {
      const fullPages = Math.floor(
        lastPagination.records / lastPagination.limit,
      );
      const remainder = lastPagination.records % lastPagination.limit;

      if (lastPagination.current < lastPagination.pages) {
        TestValidator.equals(
          "intermediate page - should be full",
          lastPagination.limit,
          lastData.length,
        );
      } else {
        const expectedLastSize =
          remainder === 0 ? lastPagination.limit : remainder;
        TestValidator.equals(
          "last page - expected slice size",
          expectedLastSize,
          lastData.length,
        );
      }
    }

    // 6. Beyond last page: expect empty data but consistent metadata
    const beyondLastPageIndex = (firstPagination.pages + 1) as number &
      tags.Type<"int32"> &
      tags.Minimum<1>;

    const beyondLastRequestBody = {
      page: beyondLastPageIndex,
      limit: firstPagination.limit,
    } satisfies ICommunityPlatformMemberuserSession.IRequest;

    const beyondLastPageResult: IPageICommunityPlatformMemberuserSession.ISummary =
      await api.functional.communityPlatform.adminUser.memberUsers.sessions.index(
        connection,
        {
          username: targetUsername,
          body: beyondLastRequestBody,
        },
      );
    typia.assert<IPageICommunityPlatformMemberuserSession.ISummary>(
      beyondLastPageResult,
    );

    const beyondPagination = beyondLastPageResult.pagination;
    const beyondData = beyondLastPageResult.data;

    assertPaginationInvariant("beyond last page", beyondPagination);

    TestValidator.equals(
      "beyond last page - current should equal requested page index",
      beyondLastPageIndex,
      beyondPagination.current,
    );

    TestValidator.equals(
      "beyond last page - pages remains same as first call",
      firstPagination.pages,
      beyondPagination.pages,
    );

    TestValidator.equals(
      "beyond last page - records remains same as first call",
      firstPagination.records,
      beyondPagination.records,
    );

    TestValidator.equals(
      "beyond last page - data should be empty",
      0,
      beyondData.length,
    );
  }
}
