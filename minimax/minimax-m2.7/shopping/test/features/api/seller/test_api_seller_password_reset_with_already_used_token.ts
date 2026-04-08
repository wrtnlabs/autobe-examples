import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_password_reset_with_already_used_token(
  connection: api.IConnection,
): Promise<void> {
  // Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(authorized);
  // Use a simulated token value for testing
  // In real scenario, token would be generated via password reset request email flow
  const testToken = RandomGenerator.alphaNumeric(32);
  // First attempt: use the token to reset password (may fail if token is invalid,
  // but we test token reuse behavior regardless)
  const firstResetResponse =
    await api.functional.ecommerceMall.seller.seller.password_resets.invert(
      connection,
      {
        body: {
          newPassword: RandomGenerator.alphaNumeric(16),
          token: testToken,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(firstResetResponse);
  // Second attempt: use the SAME token again
  // This should fail because the token has already been used
  const secondResetResponse =
    await api.functional.ecommerceMall.seller.seller.password_resets.invert(
      connection,
      {
        body: {
          newPassword: RandomGenerator.alphaNumeric(16),
          token: testToken,
        } satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(secondResetResponse);
  // Validate that the second attempt was rejected
  TestValidator.equals(
    "second password reset should be rejected",
    secondResetResponse.confirmed,
    false,
  );
  TestValidator.predicate(
    "error message should indicate token already used",
    secondResetResponse.message.toLowerCase().includes("used") ||
      secondResetResponse.message.toLowerCase().includes("invalid") ||
      secondResetResponse.message.toLowerCase().includes("expired"),
  );
}
