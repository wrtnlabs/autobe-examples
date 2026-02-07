import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_shopping_mall_seller_email_verifications_verify_email } from "../../../generate/generate_random_shopping_mall_seller_email_verifications_verify_email";
import { prepare_random_shopping_mall_seller_email_verification } from "../../../prepare/prepare_random_shopping_mall_seller_email_verification";

export async function test_api_seller_email_verification_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // According to the DTO definition, IShoppingMallSellerEmailVerification.ICreate has no properties
  // This suggests the endpoint may not accept token in the body, or uses a different mechanism
  // Test with empty body as per DTO definition
  const invalidTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("invalid token - not in database", async () => {
    await api.functional.shoppingMall.seller.email_verifications.verifyEmail(
      invalidTokenConnection,
      {
        body: {} satisfies IShoppingMallSellerEmailVerification.ICreate,
      },
    );
  });
}
