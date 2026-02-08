import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalePromotion";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_sale_promotion_index_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  // IShoppingMallAdministrator.IJoin is empty object {} as per definition
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  // Set authorization header for adminConnection
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Send request for sale promotions listing with empty/default filter
  const response =
    await api.functional.shoppingMall.administrator.sale_promotions.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallSalePromotion.IRequest,
      },
    );
  // Validate the response schema
  typia.assert(response);
  // Validate pagination data
  const pagination = response.pagination;
  // Current page should be at least 0 (likely 1)
  TestValidator.predicate(
    "current page should be >= 0",
    pagination.current >= 0,
  );
  // Limit should be non-negative
  TestValidator.predicate("limit should be >= 0", pagination.limit >= 0);
  // Records count should be >= 0
  TestValidator.predicate("records should be >= 0", pagination.records >= 0);
  // Pages should be >= 0
  TestValidator.predicate("pages should be >= 0", pagination.pages >= 0);
  // pages should be correct as ceiling(records / limit) if limit is not 0
  if (pagination.limit > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pages computed correctly",
      pagination.pages,
      expectedPages,
    );
  }
  // Validate each data item in the list conforms to IShoppingMallSalePromotion.ISummary
  for (const promo of response.data) {
    typia.assert<IShoppingMallSalePromotion.ISummary>(promo);
  }
  // Now test that unauthorized access (no auth) is rejected
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access rejects request", async () => {
    await api.functional.shoppingMall.administrator.sale_promotions.index(
      unauthConnection,
      {
        body: {} satisfies IShoppingMallSalePromotion.IRequest,
      },
    );
  });
}
