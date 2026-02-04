import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSalesPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalesPromotion";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSalesPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesPromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_promotions_filter_active_percentage(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection with token
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} as IShoppingMallAdmin.IJoin,
  });
  // Test filtering active percentage promotions with partial code match
  const activePercentagePromotions =
    await api.functional.shoppingMall.admin.promotions.index(adminConnection, {
      body: {
        discount_type: "percentage",
        is_active: true,
        promotion_code: "Percent",
      } satisfies IShoppingMallSalesPromotion.IRequest,
    });
  typia.assert(activePercentagePromotions);
  // Verify API returns at least one active percentage promotion
  TestValidator.predicate(
    "should return active percentage promotions",
    activePercentagePromotions.data.length > 0,
  );
  // Verify the first active percentage promotion data
  const examplePromotion = activePercentagePromotions.data[0];
  TestValidator.equals(
    "should contain correct discount type",
    examplePromotion.discount_type,
    "percentage",
  );
  TestValidator.equals(
    "should contain discount value",
    typeof examplePromotion.discount_value,
    "number",
  );
  TestValidator.predicate(
    "discount value should be between 0 and 1000",
    examplePromotion.discount_value >= 0 &&
      examplePromotion.discount_value <= 1000,
  );
  TestValidator.predicate(
    "should contain promotion code with 'Percent'",
    examplePromotion.promotion_code.includes("Percent"),
  );
  // Verify inactive promotions are excluded
  const inactivePromotions =
    await api.functional.shoppingMall.admin.promotions.index(adminConnection, {
      body: {
        discount_type: "percentage",
        is_active: false,
        promotion_code: "Percent",
      } satisfies IShoppingMallSalesPromotion.IRequest,
    });
  typia.assert(inactivePromotions);
  TestValidator.equals(
    "should not return inactive promotions",
    inactivePromotions.data.length,
    0,
  );
  // Verify active promotions are returned when is_active is true
  const activePromotions =
    await api.functional.shoppingMall.admin.promotions.index(adminConnection, {
      body: {
        is_active: true,
        discount_type: "percentage",
      } satisfies IShoppingMallSalesPromotion.IRequest,
    });
  typia.assert(activePromotions);
  TestValidator.predicate(
    "should return active percentage promotions",
    activePromotions.data.length > 0,
  );
}
