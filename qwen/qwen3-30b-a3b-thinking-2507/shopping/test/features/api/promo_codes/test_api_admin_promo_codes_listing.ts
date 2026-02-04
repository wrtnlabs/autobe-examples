import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSalesPromoCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalesPromoCode";
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

export async function test_api_admin_promo_codes_listing(
  connection: api.IConnection,
) {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // Fetch promo codes list
  const response: IPageIShoppingMallSalesPromoCode.ISummary =
    await api.functional.shoppingMall.admin.promo_codes.index(adminConnection, {
      body: {} satisfies IShoppingMallSalesPromoCode.IRequest,
    });
  typia.assert(response);
  // Validate response structure
  TestValidator.equals(
    "should have pagination object",
    typeof response.pagination,
    "object",
  );
  TestValidator.equals(
    "should have valid records count",
    response.pagination.records > 0,
    true,
  );
  TestValidator.equals(
    "data should be array",
    Array.isArray(response.data),
    true,
  );
  TestValidator.equals(
    "should have promo codes",
    response.data.length > 0,
    true,
  );
  // Validate first promo code structure
  const promoCode = response.data[0];
  TestValidator.equals("should have code", promoCode.code !== "", true);
  TestValidator.equals(
    "discount type should be valid",
    ["percentage", "amount"].includes(promoCode.discount_type),
    true,
  );
  TestValidator.equals(
    "should have number discount value",
    typeof promoCode.discount_value === "number",
    true,
  );
  TestValidator.equals(
    "should have string expiration date",
    typeof promoCode.expiration_date === "string",
    true,
  );
  TestValidator.equals(
    "should have number usage count",
    typeof promoCode.usage_count === "number",
    true,
  );
}
