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

export async function test_api_seller_email_verification_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Generate expired email verification token
  const expiredToken = {
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzZWxsZXItdGVzdCIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDAwMDAwfQ.expired_signature",
    expired_at: "2024-01-01T00:00:00Z",
  } satisfies IShoppingMallSellerEmailVerification.ICreate;
  // Attempt verification with expired token
  await TestValidator.error("expired token should fail", async () => {
    await api.functional.shoppingMall.seller.email_verifications.verifyEmail(
      connection,
      { body: expiredToken },
    );
  });
}
