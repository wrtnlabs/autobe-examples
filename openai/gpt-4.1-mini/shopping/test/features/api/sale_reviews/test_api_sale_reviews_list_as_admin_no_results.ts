import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleReview";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_sale_reviews_list_as_admin_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Administrator join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // Use a query that likely returns no results
  // Since IShoppingMallSaleReview.IRequest is empty in definition, we assume no filters passed returns all
  // For no result, we will craft a filter with impossible condition if possible; but since IRequest is empty, send it empty
  const body: IShoppingMallSaleReview.IRequest = {};
  const saleReviews =
    await api.functional.shoppingMall.administrator.sale_reviews.index(
      adminConnection,
      { body },
    );
  typia.assert(saleReviews);
  // Validate empty data
  TestValidator.equals("empty data array", saleReviews.data.length, 0);
  // Validate pagination fields
  TestValidator.predicate(
    "current page is number",
    typeof saleReviews.pagination.current === "number",
  );
  TestValidator.predicate(
    "limit is number",
    typeof saleReviews.pagination.limit === "number",
  );
  TestValidator.predicate(
    "records is number",
    typeof saleReviews.pagination.records === "number",
  );
  TestValidator.predicate(
    "pages is number",
    typeof saleReviews.pagination.pages === "number",
  );
  // Specifically, records and data length should be zero for no results
  TestValidator.equals("total records", saleReviews.pagination.records, 0);
  TestValidator.equals("total pages", saleReviews.pagination.pages, 0);
  TestValidator.equals("data length", saleReviews.data.length, 0);
}
