import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_seller_sales_snapshots_filtered_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  /*
    Test retrieving sale snapshots filtered by a date range.
    Verify seller authorization, that only snapshots created within the specified startDate and endDate are included, pagination is handled correctly, and response snapshot data all fall within the date range.
    */
  // 1. Seller join and authorize
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      shopName: "Test Shop",
    },
  });
  typia.assert(sellerAuthorized);
  sellerConnection.headers = {
    Authorization: sellerAuthorized.token.access,
  };
  // 2. Create a new sale to retrieve snapshots for
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        name: `Test Sale ${Date.now()}`,
        description: "Test description",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 1000,
      },
    },
  );
  typia.assert(sale);
  // Prepare snapshot date range filters
  const nowDate = new Date();
  // Set start date as 7 days before now
  const startDateISO = new Date(
    nowDate.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Set end date as now
  const endDateISO = nowDate.toISOString();
  // 3. Retrieve snapshots filtered by date range with pagination
  const limit = 5;
  let page = 1;
  let hasMore = true;
  let allSnapshots: IShoppingMallSaleSnapshot.ISummary[] = [];
  while (hasMore) {
    const snapshotPage =
      await api.functional.shoppingMall.seller.sales.snapshots.index(
        sellerConnection,
        {
          saleId: sale.id,
          body: {
            startDate: startDateISO,
            endDate: endDateISO,
            page,
            limit,
          },
        },
      );
    typia.assert(snapshotPage);
    // Validate that all returned snapshots have createdAt within [startDate, endDate]
    for (const snapshot of snapshotPage.data) {
      const createdAt = new Date(snapshot.createdAt);
      const startDate = new Date(startDateISO);
      const endDate = new Date(endDateISO);
      TestValidator.predicate(
        `snapshot createdAt >= startDate (page: ${page})`,
        createdAt >= startDate,
      );
      TestValidator.predicate(
        `snapshot createdAt <= endDate (page: ${page})`,
        createdAt <= endDate,
      );
    }
    allSnapshots = allSnapshots.concat(snapshotPage.data);
    // Pagination logic
    const currentPage = snapshotPage.pagination.current;
    const totalPages = snapshotPage.pagination.pages;
    TestValidator.equals(
      `pagination current page (page: ${page})`,
      currentPage,
      page,
    );
    hasMore = page < totalPages;
    page++;
  }
  // Ensure snapshots are unique by id
  const snapshotIds = allSnapshots.map((s) => s.id);
  const uniqueSnapshotIds = Array.from(new Set(snapshotIds));
  TestValidator.equals(
    "all snapshot ids must be unique",
    uniqueSnapshotIds.length,
    snapshotIds.length,
  );
  // 4. Authorization test: attempt to access snapshots without token
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access to snapshots",
    401,
    async () => {
      await api.functional.shoppingMall.seller.sales.snapshots.index(
        unauthConnection,
        {
          saleId: sale.id,
          body: {},
        },
      );
    },
  );
  // 5. Authorization test: attempt to access snapshots with wrong seller
  const anotherSellerConnection: api.IConnection = { host: connection.host };
  const anotherSeller = await authorize_seller_join(anotherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Another1234!",
      shopName: "Another Shop",
    },
  });
  typia.assert(anotherSeller);
  anotherSellerConnection.headers = {
    Authorization: anotherSeller.token.access,
  };
  await TestValidator.httpError(
    "seller cannot access others' snapshots",
    403,
    async () => {
      await api.functional.shoppingMall.seller.sales.snapshots.index(
        anotherSellerConnection,
        {
          saleId: sale.id,
          body: {
            startDate: startDateISO,
            endDate: endDateISO,
          },
        },
      );
    },
  );
}
