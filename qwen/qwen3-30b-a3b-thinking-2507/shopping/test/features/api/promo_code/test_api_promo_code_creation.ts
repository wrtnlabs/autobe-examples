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

export async function test_api_promo_code_creation(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  const promoCode =
    await generate_random_shopping_mall_admin_promo_codes_create(
      adminConnection,
      {},
    );
  typia.assert(promoCode);
  // Validate that the promocode code has minimum length of 3 characters
  TestValidator.equals(
    "code has minimum length",
    promoCode.code.length >= 3,
    true,
  );
  // Validate discount percentage is within business range (1-100)
  TestValidator.equals(
    "discount percentage range",
    promoCode.discount >= 1 && promoCode.discount <= 100,
    true,
  );
  // Ensure promotion is active by default
  TestValidator.equals("active status", promoCode.active, true);
  // Check that expiry date is in the future
  TestValidator.equals(
    "future expiry date",
    new Date(promoCode.expiration_date) > new Date(),
    true,
  );
  // Verify usage limits are positive (greater than 0)
  TestValidator.equals(
    "usage limit is positive",
    promoCode.usage_limit >= 1,
    true,
  );
  TestValidator.equals("max usage is positive", promoCode.max_usage >= 1, true);
}
