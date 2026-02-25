import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalePromotion";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sale_promotions_analytics_filter_active(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test sale promotions analytics retrieval with filtering by active status
  // 1. Authenticate as administrator using the provided authorize utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
    },
  });
  typia.assert(adminAuthorized);
  // Update adminConnection headers with authorization token
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // 2. Submit PATCH request to /shoppingMall/administrator/analytics/sale-promotions
  //    filtering only active promotions
  const requestBody: IShoppingMallSalePromotion.IRequest = {
    active: true,
    page: 1,
    limit: 10,
  };
  const response =
    await api.functional.shoppingMall.administrator.analytics.sale_promotions.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  // Ensure response matches expected summary pagination structure
  typia.assert(response);
  // 3. Validate that all returned promotions are active
  for (const promotion of response.data) {
    TestValidator.predicate(
      "promotion active status",
      promotion.active === true,
    );
    // Validate presence and correct typing of key fields in promotion summary
    typia.assert(promotion.id);
    // promotionCode can be undefined or null, no assertion needed
    typia.assert(promotion.promotionType);
    // description can be nullable
    // discountValue is number
    typia.assert(promotion.discountValue);
    typia.assert(promotion.discountType);
    typia.assert(promotion.startAt);
    typia.assert(promotion.endAt);
    typia.assert(promotion.active);
    typia.assert(promotion.createdAt);
    typia.assert(promotion.updatedAt);
    // deletedAt can be nullable
    // sale is nested summary
    typia.assert(promotion.sale);
    // Also verify nested sale summary required fields
    typia.assert(promotion.sale.id);
    typia.assert(promotion.sale.name);
    typia.assert(promotion.sale.basePrice);
    typia.assert(promotion.sale.status);
    typia.assert(promotion.sale.createdAt);
    typia.assert(promotion.sale.updatedAt);
    // deletedAt may be null
    // seller summary validation
    typia.assert(promotion.sale.seller);
    typia.assert(promotion.sale.category);
  }
  // 4. Validate pagination info presence
  typia.assert(response.pagination);
  TestValidator.predicate(
    "pagination current page >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
}
