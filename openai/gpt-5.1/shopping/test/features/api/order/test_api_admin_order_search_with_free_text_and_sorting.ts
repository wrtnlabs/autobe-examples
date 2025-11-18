import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderSearch";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallOrderSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSearch";

export async function test_api_admin_order_search_with_free_text_and_sorting(
  connection: api.IConnection,
) {
  // 1. Join as admin to obtain authorization context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. First, perform a baseline search without free_text but with pagination and sorting
  //    to discover an existing order_code and grand_total_amount distribution.
  const baselineRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sort_key: "grand_total_amount",
    sort_direction: "asc",
  } satisfies IShoppingMallOrderSearch.IRequest;

  const baselinePage =
    await api.functional.shoppingMall.admin.search.orders.index(connection, {
      body: baselineRequest,
    });
  typia.assert<IPageIShoppingMallOrderSearch.ISummary>(baselinePage);

  const pagination = baselinePage.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // If there are any orders, we will use the order_code of the first record as free_text.
  const hasAnyOrders = baselinePage.data.length > 0;

  if (hasAnyOrders) {
    const sampleOrder = baselinePage.data[0];
    typia.assert<IShoppingMallOrderSearch.ISummary>(sampleOrder);

    const freeText = sampleOrder.order_code.substring(
      0,
      Math.max(1, Math.min(5, sampleOrder.order_code.length)),
    );

    // 3. Search with free_text and ascending sort by grand_total_amount.
    const ascRequest = {
      free_text: freeText,
      page: 1 as number & tags.Type<"int32">,
      limit: 20 as number & tags.Type<"int32">,
      sort_key: "grand_total_amount",
      sort_direction: "asc",
    } satisfies IShoppingMallOrderSearch.IRequest;

    const ascPage = await api.functional.shoppingMall.admin.search.orders.index(
      connection,
      {
        body: ascRequest,
      },
    );
    typia.assert<IPageIShoppingMallOrderSearch.ISummary>(ascPage);

    // Assert all results contain the free_text in order_code.
    for (const order of ascPage.data) {
      typia.assert<IShoppingMallOrderSearch.ISummary>(order);
      TestValidator.predicate(
        "order_code should contain free_text in asc search",
        order.order_code.includes(freeText),
      );
    }

    // Assert ascending sort by grand_total_amount.
    for (let i = 1; i < ascPage.data.length; i++) {
      const prev = ascPage.data[i - 1];
      const curr = ascPage.data[i];
      TestValidator.predicate(
        "grand_total_amount should be ascending for asc search",
        prev.grand_total_amount <= curr.grand_total_amount,
      );
    }

    // 4. Search with the same free_text and descending sort by grand_total_amount.
    const descRequest = {
      free_text: freeText,
      page: 1 as number & tags.Type<"int32">,
      limit: 20 as number & tags.Type<"int32">,
      sort_key: "grand_total_amount",
      sort_direction: "desc",
    } satisfies IShoppingMallOrderSearch.IRequest;

    const descPage =
      await api.functional.shoppingMall.admin.search.orders.index(connection, {
        body: descRequest,
      });
    typia.assert<IPageIShoppingMallOrderSearch.ISummary>(descPage);

    for (const order of descPage.data) {
      typia.assert<IShoppingMallOrderSearch.ISummary>(order);
      TestValidator.predicate(
        "order_code should contain free_text in desc search",
        order.order_code.includes(freeText),
      );
    }

    for (let i = 1; i < descPage.data.length; i++) {
      const prev = descPage.data[i - 1];
      const curr = descPage.data[i];
      TestValidator.predicate(
        "grand_total_amount should be descending for desc search",
        prev.grand_total_amount >= curr.grand_total_amount,
      );
    }

    // 5. Optionally, if both asc and desc have at least one result, assert
    //    boundary relationship (min vs max) for consistency.
    if (ascPage.data.length > 0 && descPage.data.length > 0) {
      const ascFirst = ascPage.data[0];
      const ascLast = ascPage.data[ascPage.data.length - 1];
      const descFirst = descPage.data[0];
      const descLast = descPage.data[descPage.data.length - 1];

      TestValidator.predicate(
        "min grand_total_amount in asc should be >= max grand_total_amount in desc or vice versa",
        ascFirst.grand_total_amount <= ascLast.grand_total_amount &&
          descFirst.grand_total_amount >= descLast.grand_total_amount,
      );
    }
  }

  // 6. Search with a free_text that should not exist in any order_code to verify empty result.
  const nonexistentFreeText = `NO_MATCH_${RandomGenerator.alphaNumeric(12)}`;

  const emptyRequest = {
    free_text: nonexistentFreeText,
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    sort_key: "grand_total_amount",
    sort_direction: "asc",
  } satisfies IShoppingMallOrderSearch.IRequest;

  const emptyPage = await api.functional.shoppingMall.admin.search.orders.index(
    connection,
    {
      body: emptyRequest,
    },
  );
  typia.assert<IPageIShoppingMallOrderSearch.ISummary>(emptyPage);

  TestValidator.equals(
    "no orders should match nonexistent free_text",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "records should be 0 for nonexistent free_text",
    emptyPage.pagination.records,
    0,
  );
}
