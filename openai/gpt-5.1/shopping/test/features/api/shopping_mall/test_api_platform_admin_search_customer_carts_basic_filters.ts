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

export async function test_api_platform_admin_search_customer_carts_basic_filters(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin so that subsequent calls are authorized.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Basic search with only page/limit to get the first page of carts.
  const basicSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCustomerCart.IRequest;

  const basicPage: IPageIShoppingMallCustomerCart.ISummary =
    await api.functional.shoppingMall.platformAdmin.customerCarts.index(
      connection,
      { body: basicSearchBody },
    );
  typia.assert<IPageIShoppingMallCustomerCart.ISummary>(basicPage);

  const pagination = basicPage.pagination;
  const data = basicPage.data;

  // Pagination invariants
  TestValidator.predicate(
    "pagination.limit must be positive",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.current must be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "data length must not exceed pagination.limit",
    data.length <= pagination.limit,
  );

  if (pagination.records === 0) {
    TestValidator.equals(
      "when no records, data array must be empty",
      data.length,
      0,
    );
    TestValidator.equals(
      "when no records, pages must be zero",
      pagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "when records > 0, pages must be at least 1",
      pagination.pages >= 1,
    );
  }

  // Ensure that, when include_deleted is omitted, we do not see soft-deleted carts.
  for (const cart of data) {
    TestValidator.predicate(
      "soft-deleted carts must not appear when include_deleted is omitted",
      cart.deleted_at === undefined || cart.deleted_at === null,
    );
  }

  // 3. Filtered search using is_active and created_from/created_to
  if (data.length > 0) {
    const sampleCart: IShoppingMallCustomerCart.ISummary = data[0];
    const isActiveFilter = sampleCart.is_active;

    // Time window: 30 days before now to now
    const now = new Date();
    const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const createdFrom = past.toISOString();
    const createdTo = now.toISOString();

    const filteredBody = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
      is_active: isActiveFilter,
      created_from: createdFrom,
      created_to: createdTo,
    } satisfies IShoppingMallCustomerCart.IRequest;

    const filteredPage: IPageIShoppingMallCustomerCart.ISummary =
      await api.functional.shoppingMall.platformAdmin.customerCarts.index(
        connection,
        { body: filteredBody },
      );
    typia.assert<IPageIShoppingMallCustomerCart.ISummary>(filteredPage);

    for (const cart of filteredPage.data) {
      TestValidator.equals(
        "filtered cart is_active must match requested is_active",
        cart.is_active,
        isActiveFilter,
      );

      const createdAtDate = new Date(cart.created_at);
      const fromDate = new Date(createdFrom);
      const toDate = new Date(createdTo);

      TestValidator.predicate(
        "filtered cart created_at must be within [created_from, created_to]",
        createdAtDate.getTime() >= fromDate.getTime() &&
          createdAtDate.getTime() <= toDate.getTime(),
      );
    }
  }

  // 4. Negative path: unauthenticated caller should not access this endpoint.
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated client must not access platformAdmin customer carts index",
    async () => {
      const unauthorizedBody = {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IShoppingMallCustomerCart.IRequest;

      await api.functional.shoppingMall.platformAdmin.customerCarts.index(
        unauthenticated,
        { body: unauthorizedBody },
      );
    },
  );
}
