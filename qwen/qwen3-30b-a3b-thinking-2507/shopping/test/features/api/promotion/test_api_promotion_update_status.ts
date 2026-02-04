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

export async function test_api_promotion_update_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create a base promotion
  const promotion = await generate_random_shopping_mall_admin_promotions_create(
    adminConnection,
    {},
  );
  typia.assert(promotion);
  // Step 3: Verify promotion is initially active
  TestValidator.equals("promotion is active", promotion.is_active, true);
  // Step 4: Update promotion status
  const updatedPromotion =
    await api.functional.shoppingMall.admin.promotions.update(adminConnection, {
      promotionId: promotion.id,
      body: {
        status: "inactive",
      } satisfies IShoppingMallSalesPromotion.IUpdate,
    });
  typia.assert(updatedPromotion);
  // Step 5: Verify update
  TestValidator.equals(
    "promotion status updated to 'inactive'",
    updatedPromotion.is_active,
    false,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    promotion.updated_at,
    updatedPromotion.updated_at,
  );
}
