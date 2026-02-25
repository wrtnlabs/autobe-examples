import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleFavorite";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleFavorite";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an administrator can retrieve a paginated list of sale favorites filtered by sale ID and sorted by creation date.
 * This verifies the sale filter, sorting options, pagination, and that authorization is enforced.
 */
export async function test_api_sale_favorites_report_filter_by_sale_and_sort_created_at(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins (registers)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@test.com",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies DeepPartial<IShoppingMallAdministrator.IJoin>,
  });
  // Update adminConnection headers with token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Prepare filter by sale ID
  // For testing filter, pick a random saleId from existing favorites by querying without filter
  // To do this, first we get a page of sale favorites without any filter (with limit 1) to get a saleId
  const pageInitial =
    await api.functional.shoppingMall.administrator.reports.sale_favorites.index(
      adminConnection,
      {
        body: {
          limit: 1,
        } satisfies IShoppingMallSaleFavorite.IRequest,
      },
    );
  typia.assert(pageInitial);
  // Proceed only if we have at least one favorite to test filtering
  if (pageInitial.pagination.records === 0) {
    // No favorites to test against, so ensure empty response with filter
    const requestBodyEmptyFilter = {
      saleId: typia.random<string & tags.Format<"uuid">>(),
      limit: 5,
      sort: "created_at",
    } satisfies IShoppingMallSaleFavorite.IRequest;
    const responseEmptyPage =
      await api.functional.shoppingMall.administrator.reports.sale_favorites.index(
        adminConnection,
        {
          body: requestBodyEmptyFilter,
        },
      );
    typia.assert(responseEmptyPage);
    TestValidator.equals(
      "empty records with unknown saleId filter",
      responseEmptyPage.pagination.records,
      0,
    );
    return;
  }
  // Extract an actual saleId to test filtering
  const saleIdToTest: string & tags.Format<"uuid"> =
    pageInitial.data[0].sale.id;
  // 3. Request paginated sale favorites with filter by saleId and sort by createdAt
  const requestBody: IShoppingMallSaleFavorite.IRequest = {
    saleId: saleIdToTest,
    limit: 10,
    page: 1,
    sort: "created_at",
  };
  const pageWithFilter =
    await api.functional.shoppingMall.administrator.reports.sale_favorites.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageWithFilter);
  // 4. Validate that all returned favorites have the requested saleId
  for (const favorite of pageWithFilter.data) {
    TestValidator.equals(
      "saleId matches filter",
      favorite.sale.id,
      saleIdToTest,
    );
  }
  // 5. Validate pagination correctness
  TestValidator.predicate(
    "current page number is 1",
    pageWithFilter.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is respected",
    pageWithFilter.data.length <= (requestBody.limit ?? 10),
  );
  // 6. Validate sorting order ascending by createdAt
  for (let i = 1; i < pageWithFilter.data.length; i++) {
    const prev = new Date(pageWithFilter.data[i - 1].createdAt).getTime();
    const curr = new Date(pageWithFilter.data[i].createdAt).getTime();
    TestValidator.predicate(
      `order by createdAt ascending for index ${i - 1} and ${i}`,
      prev <= curr,
    );
  }
  // 7. Test unauthorized access fails
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access forbidden", async () => {
    await api.functional.shoppingMall.administrator.reports.sale_favorites.index(
      guestConnection,
      {
        body: requestBody,
      },
    );
  });
}
