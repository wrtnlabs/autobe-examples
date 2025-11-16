import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSecurityEvent";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEvent";

export async function test_api_security_events_search_pagination_navigation(
  connection: api.IConnection,
) {
  /** Helper to validate basic pagination invariants for a single page. */
  const assertPagination = (
    titlePrefix: string,
    page: IPageIShoppingMallSecurityEvent.ISummary,
    requestedLimit: number,
  ): void => {
    typia.assert<IPageIShoppingMallSecurityEvent.ISummary>(page);
    const meta = page.pagination;

    TestValidator.predicate(
      `${titlePrefix} - current page index is non-negative`,
      meta.current >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - limit is non-negative`,
      meta.limit >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - records is non-negative`,
      meta.records >= 0,
    );
    TestValidator.predicate(
      `${titlePrefix} - pages is non-negative`,
      meta.pages >= 0,
    );

    // data length must not exceed limit (when backend applies caps,
    // meta.limit may differ from requestedLimit but should still bound data).
    TestValidator.predicate(
      `${titlePrefix} - data length does not exceed effective limit`,
      page.data.length <= meta.limit,
    );

    // When there are no records, pages should be 0 and data empty.
    if (meta.records === 0) {
      TestValidator.equals(
        `${titlePrefix} - no records implies zero pages`,
        meta.pages,
        0,
      );
      TestValidator.equals(
        `${titlePrefix} - no records implies empty data`,
        page.data.length,
        0,
      );
    }

    // Optionally, check that effective limit does not exceed requested limit.
    TestValidator.predicate(
      `${titlePrefix} - effective limit does not exceed requested limit`,
      meta.limit <= requestedLimit,
    );
  };

  // 1. Join a new platform admin; this sets Authorization header on `connection`.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "Admin1234!",
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinRequest,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. First page query with small limit.
  const requestedLimit: number = 5;
  const firstRequestBody = {
    page: 1 satisfies number as number,
    limit: requestedLimit satisfies number as number,
  } satisfies IShoppingMallSecurityEvent.IRequest;

  const firstPage =
    await api.functional.shoppingMall.platformAdmin.securityEvents.index(
      connection,
      { body: firstRequestBody },
    );
  assertPagination("first page", firstPage, requestedLimit);

  const firstMeta = firstPage.pagination;

  // When there are multiple pages, navigate to the last page.
  if (firstMeta.pages > 1) {
    const lastPageIndex: number = firstMeta.pages;

    const lastRequestBody = {
      page: lastPageIndex satisfies number as number,
      limit: requestedLimit satisfies number as number,
    } satisfies IShoppingMallSecurityEvent.IRequest;

    const lastPage =
      await api.functional.shoppingMall.platformAdmin.securityEvents.index(
        connection,
        { body: lastRequestBody },
      );
    assertPagination("last page", lastPage, requestedLimit);

    const lastMeta = lastPage.pagination;

    // records and pages should be consistent across calls for same filter.
    TestValidator.equals(
      "records count is consistent between first and last page",
      firstMeta.records,
      lastMeta.records,
    );
    TestValidator.equals(
      "pages count is consistent between first and last page",
      firstMeta.pages,
      lastMeta.pages,
    );

    // Effective limits should match when both > 0.
    if (firstMeta.limit > 0 && lastMeta.limit > 0) {
      TestValidator.equals(
        "effective limit is stable between first and last page",
        firstMeta.limit,
        lastMeta.limit,
      );
    }

    // Collect IDs and ensure no duplicates within each page.
    const firstIds = firstPage.data.map((e) => e.id);
    const lastIds = lastPage.data.map((e) => e.id);

    const uniqueFirstIds = Array.from(new Set(firstIds));
    const uniqueLastIds = Array.from(new Set(lastIds));

    TestValidator.equals(
      "first page has no duplicate IDs",
      uniqueFirstIds.length,
      firstIds.length,
    );
    TestValidator.equals(
      "last page has no duplicate IDs",
      uniqueLastIds.length,
      lastIds.length,
    );

    // When total records are large enough to fill at least two full pages,
    // the first and last pages should not be identical sets of IDs.
    if (firstMeta.records >= requestedLimit * 2) {
      const intersectionSize = uniqueFirstIds.filter((id) =>
        uniqueLastIds.includes(id),
      ).length;

      TestValidator.predicate(
        "first and last pages are not identical when enough records exist",
        intersectionSize < uniqueFirstIds.length ||
          intersectionSize < uniqueLastIds.length,
      );
    }

    // 6. Optional: request a page beyond the last page and check minimal invariants.
    const beyondPageIndex: number = lastMeta.pages + 1;
    const beyondRequestBody = {
      page: beyondPageIndex satisfies number as number,
      limit: requestedLimit satisfies number as number,
    } satisfies IShoppingMallSecurityEvent.IRequest;

    const beyondPage =
      await api.functional.shoppingMall.platformAdmin.securityEvents.index(
        connection,
        { body: beyondRequestBody },
      );
    assertPagination("beyond last page", beyondPage, requestedLimit);
  } else {
    // If there is only one page, re-request the first page and ensure stability.
    const secondRequestBody = {
      page: 1 satisfies number as number,
      limit: requestedLimit satisfies number as number,
    } satisfies IShoppingMallSecurityEvent.IRequest;

    const secondPage =
      await api.functional.shoppingMall.platformAdmin.securityEvents.index(
        connection,
        { body: secondRequestBody },
      );
    assertPagination("reloaded first page", secondPage, requestedLimit);

    const secondMeta = secondPage.pagination;

    TestValidator.equals(
      "records count is stable when reloading single page",
      firstMeta.records,
      secondMeta.records,
    );
    TestValidator.equals(
      "pages count is stable when reloading single page",
      firstMeta.pages,
      secondMeta.pages,
    );
  }
}
