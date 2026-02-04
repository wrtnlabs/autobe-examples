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

export async function test_api_promotion_creation_with_minimum_length_name(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "password123",
      role: "admin",
      name: "Admin User",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const minName = "X2A";
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);
  const promotion = await generate_random_shopping_mall_admin_promotions_create(
    adminConnection,
    {
      body: {
        name: minName,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
    },
  );
  typia.assert(promotion);
  TestValidator.equals("promotion name should match", promotion.name, minName);
  TestValidator.equals(
    "start date should match",
    promotion.start_date,
    startDate.toISOString(),
  );
  TestValidator.equals(
    "end date should match",
    promotion.end_date,
    endDate.toISOString(),
  );
  TestValidator.predicate(
    "end_date must be after start_date",
    new Date(promotion.end_date) > new Date(promotion.start_date),
  );
  TestValidator.equals(
    "name should be 3 characters",
    promotion.name.length,
    minName.length,
  );
}
