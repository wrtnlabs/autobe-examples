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

export async function test_api_administrator_sale_promotions_analytics_filter_promotion_code(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication and obtain adminConnection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin+${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "TestPassword123",
    },
  });
  typia.assert(admin);
  // 2. Generate a promotion code to filter
  const filterPromotionCode = `PROMO-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  // 3. Prepare request body for analytics API with promotionCode filter
  const body: IShoppingMallSalePromotion.IRequest = {
    promotionCode: filterPromotionCode,
    page: 1,
    limit: 10,
  };
  // 4. Call the analytics sales promotions patch API with filter
  const result =
    await api.functional.shoppingMall.administrator.analytics.sale_promotions.index(
      adminConnection,
      {
        body,
      },
    );
  typia.assert(result);
  // 5. Validate pagination object
  const pagination = result.pagination;
  TestValidator.predicate(
    "pagination current page positive",
    pagination.current > 0,
  );
  TestValidator.predicate("pagination limit positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  // 6. Validate each promotion summary in data
  for (const promo of result.data) {
    typia.assert(promo);
    // promotionCode must not be null/undefined and must contain the filter code
    TestValidator.predicate(
      `promotionCode is defined for promotion with ID: ${promo.id}`,
      promo.promotionCode !== null && promo.promotionCode !== undefined,
    );
    TestValidator.predicate(
      `promotionCode includes filter code for promotion with ID: ${promo.id}`,
      promo
        .promotionCode!.toUpperCase()
        .includes(filterPromotionCode.toUpperCase()),
    );
    // Validate summary fields consistency
    TestValidator.predicate(
      "discountValue non-negative",
      promo.discountValue >= 0,
    );
    TestValidator.predicate(
      "startAt is before or equal to endAt",
      new Date(promo.startAt).getTime() <= new Date(promo.endAt).getTime(),
    );
    TestValidator.predicate(
      "createdAt is a valid date",
      !isNaN(new Date(promo.createdAt).getTime()),
    );
  }
}
