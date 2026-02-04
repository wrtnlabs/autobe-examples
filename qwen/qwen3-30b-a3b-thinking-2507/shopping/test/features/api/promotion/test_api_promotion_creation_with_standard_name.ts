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

export async function test_api_promotion_creation_with_standard_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    },
  });
  // Step 2: Generate test data with dates 7 and 14 days in future
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysFromNow = new Date(
    now.getTime() + 14 * 24 * 60 * 60 * 1000,
  );
  const promotionName = "Summer Sale";
  // Step 3: Create promotion with the correct values
  const promotion = await generate_random_shopping_mall_admin_promotions_create(
    adminConnection,
    {
      body: {
        name: promotionName,
        start_date: sevenDaysFromNow.toISOString(),
        end_date: fourteenDaysFromNow.toISOString(),
      },
    },
  );
  // Step 4: Verify the promotion details
  typia.assert(promotion);
  TestValidator.equals(
    "promotion name matches input",
    promotion.name,
    promotionName,
  );
  TestValidator.equals(
    "promotion_code matches auto-generation",
    promotion.promotion_code,
    promotionName.toUpperCase().replace(/ /g, "") + "",
  );
  TestValidator.equals("promotion is active", promotion.is_active, true);
  TestValidator.equals(
    "start_date matches expected",
    promotion.start_date,
    sevenDaysFromNow.toISOString(),
  );
  TestValidator.equals(
    "end_date matches expected",
    promotion.end_date,
    fourteenDaysFromNow.toISOString(),
  );
}
