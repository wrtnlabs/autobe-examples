import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellerPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetRequest";
import type { IShoppingMallSellerPasswordResetRequestResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetRequestResponse";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_password_reset_request(
  connection: api.IConnection,
): Promise<void> {
  // Seller initiates password reset request
  const result =
    await api.functional.shoppingMall.seller.password_resets.requestPasswordReset(
      connection,
      {
        body: {},
      },
    );
  // Verify response structure
  typia.assert(result);
}
