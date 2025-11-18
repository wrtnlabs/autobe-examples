import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethod";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

export async function test_api_admin_payment_method_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. First page: page=1, limit=5, sort by created_at desc
  const requestPage1 = {
    page: 1,
    limit: 5,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies IShoppingMallPaymentMethod.IRequest;

  const page1: IPageIShoppingMallPaymentMethod.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.index(connection, {
      body: requestPage1,
    });
  typia.assert<IPageIShoppingMallPaymentMethod.ISummary>(page1);

  const pagination1 = page1.pagination;
  const data1 = page1.data;

  // 3. Second page: page=2 with same limit and sorting
  const requestPage2 = {
    page: 2,
    limit: 5,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies IShoppingMallPaymentMethod.IRequest;

  const page2: IPageIShoppingMallPaymentMethod.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.index(connection, {
      body: requestPage2,
    });
  typia.assert<IPageIShoppingMallPaymentMethod.ISummary>(page2);

  const pagination2 = page2.pagination;
  const data2 = page2.data;

  // 4. Basic pagination consistency checks
  TestValidator.equals("pagination current page 1", pagination1.current, 1);
  TestValidator.equals("pagination current page 2", pagination2.current, 2);
  TestValidator.equals(
    "pagination limit matches between pages",
    pagination1.limit,
    pagination2.limit,
  );
  TestValidator.equals(
    "pagination records matches between pages",
    pagination1.records,
    pagination2.records,
  );
  TestValidator.equals(
    "pagination pages matches between pages",
    pagination1.pages,
    pagination2.pages,
  );

  // If enough records, expect at least 3 pages
  if (pagination1.records >= 15) {
    TestValidator.predicate(
      "pagination pages >= 3 when records >= 15",
      pagination1.pages >= 3,
    );
  }

  // 5. Non-overlap of IDs between page1 and page2 when multiple pages exist
  if (pagination1.pages >= 2 && data1.length > 0 && data2.length > 0) {
    const ids1 = data1.map((m) => m.id);
    const ids2 = data2.map((m) => m.id);

    const hasOverlap = ids1.some((id) => ids2.includes(id));
    TestValidator.predicate(
      "no overlapping payment method ids between page 1 and 2",
      hasOverlap === false,
    );
  }

  // Helper to verify sorting by created_at
  const assertSortedByCreatedAt = (
    title: string,
    rows: IShoppingMallPaymentMethod.ISummary[],
    direction: "asc" | "desc",
  ): void => {
    if (rows.length <= 1) return;

    const isOrdered = rows.every((row, index, array) => {
      if (index === 0) return true;
      const prev = array[index - 1];
      const current = row;
      if (direction === "desc") return prev.created_at >= current.created_at;
      return prev.created_at <= current.created_at;
    });

    TestValidator.predicate(title, isOrdered);
  };

  // 6. Verify ordering for page1 and page2
  assertSortedByCreatedAt(
    "payment methods page 1 sorted by created_at desc",
    data1,
    "desc",
  );
  assertSortedByCreatedAt(
    "payment methods page 2 sorted by created_at desc",
    data2,
    "desc",
  );

  // 7. Validate combined pages against a global sorted snapshot
  if (pagination1.records > 0) {
    const globalLimit = pagination1.records < 50 ? pagination1.records : 50;

    const globalRequest = {
      page: 1,
      limit: globalLimit,
      sortBy: "created_at",
      sortDirection: "desc",
    } satisfies IShoppingMallPaymentMethod.IRequest;

    const globalPage: IPageIShoppingMallPaymentMethod.ISummary =
      await api.functional.shoppingMall.admin.paymentMethods.index(connection, {
        body: globalRequest,
      });
    typia.assert<IPageIShoppingMallPaymentMethod.ISummary>(globalPage);

    const combined = [...data1, ...data2];
    const compareLength =
      combined.length < globalPage.data.length
        ? combined.length
        : globalPage.data.length;

    if (compareLength > 0) {
      const prefixMatches = ArrayUtil.repeat(compareLength, (index) => {
        return combined[index].id === globalPage.data[index].id;
      }).every((flag) => flag === true);

      TestValidator.predicate(
        "combined first two pages match prefix of globally sorted result",
        prefixMatches,
      );
    }
  }

  // 8. Optional ascending direction check on page 1
  if (pagination1.records > 0) {
    const ascRequest = {
      page: 1,
      limit: 5,
      sortBy: "created_at",
      sortDirection: "asc",
    } satisfies IShoppingMallPaymentMethod.IRequest;

    const ascPage: IPageIShoppingMallPaymentMethod.ISummary =
      await api.functional.shoppingMall.admin.paymentMethods.index(connection, {
        body: ascRequest,
      });
    typia.assert<IPageIShoppingMallPaymentMethod.ISummary>(ascPage);

    assertSortedByCreatedAt(
      "payment methods page 1 sorted by created_at asc",
      ascPage.data,
      "asc",
    );
  }
}
