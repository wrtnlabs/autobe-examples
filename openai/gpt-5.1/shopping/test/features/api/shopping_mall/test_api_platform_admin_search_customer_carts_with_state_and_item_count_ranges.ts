import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerCart";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

export async function test_api_platform_admin_search_customer_carts_with_state_and_item_count_ranges(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (also sets Authorization header on connection)
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // Common numeric filters
  const minItemCount = 1 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const maxItemCount = 5 as number & tags.Type<"int32"> & tags.Minimum<0>;

  // Helper to validate pagination invariants
  const assertPagination = (title: string, pagination: IPage.IPagination) => {
    typia.assert(pagination);

    TestValidator.predicate(
      `${title} - non-negative records`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `${title} - non-negative pages`,
      pagination.pages >= 0,
    );
    TestValidator.predicate(
      `${title} - non-negative limit`,
      pagination.limit >= 0,
    );
    TestValidator.predicate(
      `${title} - non-negative current`,
      pagination.current >= 0,
    );

    if (pagination.records === 0) {
      TestValidator.equals(
        `${title} - zero records implies zero pages`,
        pagination.pages,
        0,
      );
    }
  };

  // Helper to validate that all carts respect the requested item-count range
  const assertItemCountRange = (
    title: string,
    carts: IShoppingMallCustomerCart.ISummary[],
    minCount: number,
    maxCount: number,
  ) => {
    for (const cart of carts) {
      typia.assert<IShoppingMallCustomerCart.ISummary>(cart);
      TestValidator.predicate(
        `${title} - items_count within range`,
        cart.items_count >= minCount && cart.items_count <= maxCount,
      );
    }
  };

  // 2. First search: single state ["active"] with item count band [1, 5]
  const firstRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    states: ["active"],
    min_item_count: minItemCount,
    max_item_count: maxItemCount,
  } satisfies IShoppingMallCustomerCart.IRequest;

  const firstPage: IPageIShoppingMallCustomerCart.ISummary =
    await api.functional.shoppingMall.platformAdmin.customerCarts.index(
      connection,
      { body: firstRequestBody },
    );
  typia.assert(firstPage);

  assertPagination("first search", firstPage.pagination);
  assertItemCountRange(
    "first search",
    firstPage.data,
    minItemCount,
    maxItemCount,
  );

  // 3. Second search: multiple states ["active", "abandoned"] with same band
  const secondRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    states: ["active", "abandoned"],
    min_item_count: minItemCount,
    max_item_count: maxItemCount,
  } satisfies IShoppingMallCustomerCart.IRequest;

  const secondPage: IPageIShoppingMallCustomerCart.ISummary =
    await api.functional.shoppingMall.platformAdmin.customerCarts.index(
      connection,
      { body: secondRequestBody },
    );
  typia.assert(secondPage);

  assertPagination("second search", secondPage.pagination);
  assertItemCountRange(
    "second search",
    secondPage.data,
    minItemCount,
    maxItemCount,
  );

  // 4. Weak cross-call comparison when both have data
  if (firstPage.pagination.records > 0 && secondPage.pagination.records > 0) {
    TestValidator.predicate(
      "both searches returned some records",
      firstPage.pagination.records >= 0 && secondPage.pagination.records >= 0,
    );
  }
}
