import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_admin_promotions_create } from "../../../generate/generate_random_shopping_mall_admin_promotions_create";
import { prepare_random_shopping_mall_sales_promotion } from "../../../prepare/prepare_random_shopping_mall_sales_promotion";

/**
 * Test promotion creation with exact 1-day date range (end_date = start_date + 1 day), verifying the business rule that end_date must be strictly greater than start_date.
 * Validates the date range constraint for promotion validity periods.
 */
export async function test_api_promotion_creation_with_end_date_one_day_after_start_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Create a promotion with start and end dates 24 hours apart (in UTC time)
  const start = new Date();
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const promotion = await generate_random_shopping_mall_admin_promotions_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      },
    },
  );
  typia.assert(promotion);
  // 3. Validate business rule: end_date must be exactly 1 day after start_date
  // The business rule requires that end_date > start_date by exactly 24 hours
  const startDate = new Date(promotion.start_date);
  const endDate = new Date(promotion.end_date);
  const differenceInHours =
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  // Verify end_date is exactly 24 hours (1 day) after start_date
  // This validates the business rule that requires promotions to have exactly 1-day validity periods
  const expectedDifference = 24;
  typia.assert(differenceInHours === expectedDifference);
  TestValidator.equals(
    "end_date should be exactly one day after start_date (business rule validation)",
    differenceInHours,
    expectedDifference,
  );
}
