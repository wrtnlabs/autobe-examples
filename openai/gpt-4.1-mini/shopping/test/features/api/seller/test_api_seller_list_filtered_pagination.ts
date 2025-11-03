import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_list_filtered_pagination(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPassword123!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Retrieve seller list filtering by partial store name match
  // Using store_name sample from seller list without email filter
  const sellersWithoutFilter =
    await api.functional.shoppingMall.admin.sellers.indexSellers(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(sellersWithoutFilter);

  if (sellersWithoutFilter.data.length > 0) {
    const sampleStoreNamePart = sellersWithoutFilter.data[0].store_name.slice(
      0,
      3,
    );

    const sellersFilteredByStoreName =
      await api.functional.shoppingMall.admin.sellers.indexSellers(connection, {
        body: {
          store_name: sampleStoreNamePart,
          page: 1,
          limit: 10,
          sort_by: "store_name",
          sort_order: "asc",
        } satisfies IShoppingMallSeller.IRequest,
      });
    typia.assert(sellersFilteredByStoreName);
    TestValidator.predicate(
      "all sellers store_name contains filter part",
      sellersFilteredByStoreName.data.every((seller) =>
        seller.store_name.includes(sampleStoreNamePart),
      ),
    );
  }

  // 3. Edge case: request with empty filter (should return at least 0 sellers)
  TestValidator.predicate(
    "pagination current page equals 1",
    sellersWithoutFilter.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit equals 20",
    sellersWithoutFilter.pagination.limit === 20,
  );

  // 4. Edge case: request page beyond total pages (should return empty data array)
  const lastPage = sellersWithoutFilter.pagination.pages + 10;
  const sellersLastPage =
    await api.functional.shoppingMall.admin.sellers.indexSellers(connection, {
      body: {
        page: lastPage,
        limit: 20,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(sellersLastPage);
  TestValidator.equals(
    "last page request returns empty data",
    sellersLastPage.data,
    [],
  );
  TestValidator.equals(
    "last page request current page equals requested",
    sellersLastPage.pagination.current,
    lastPage,
  );
}
