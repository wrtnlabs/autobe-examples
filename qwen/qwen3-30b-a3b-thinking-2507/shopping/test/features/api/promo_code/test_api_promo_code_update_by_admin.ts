import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSalesPromoCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesPromoCode";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_promo_codes_create } from "../../../generate/generate_random_shopping_mall_admin_promo_codes_create";
import { prepare_random_shopping_mall_sales_promo_code } from "../../../prepare/prepare_random_shopping_mall_sales_promo_code";

export async function test_api_promo_code_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin connection with authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test123",
    },
  });
  // Step 2: Create a promo code
  const promoCode =
    await generate_random_shopping_mall_admin_promo_codes_create(
      adminConnection,
      {
        body: {
          code: typia.random<string & tags.MinLength<3>>(),
          discount_percentage: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          expiry_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          usage_limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          max_usage: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(promoCode);
  // Step 3: Update the promo code
  const updatedPromoCode =
    await api.functional.shoppingMall.admin.promo_codes.update(
      adminConnection,
      {
        promoCodeId: promoCode.id,
        body: {},
      },
    );
  typia.assert(updatedPromoCode);
  // Step 4: Verify the updated promo code has new values
  TestValidator.equals(
    "discount should be incremented by 5",
    updatedPromoCode.discount,
    promoCode.discount + 5,
  );
  TestValidator.equals(
    "expiration date should be updated",
    updatedPromoCode.expiration_date,
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  );
}