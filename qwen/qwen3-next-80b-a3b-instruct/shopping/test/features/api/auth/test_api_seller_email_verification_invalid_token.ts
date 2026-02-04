import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerification";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_email_verification_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate seller to generate valid verification token
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    });
  // Step 2: Create a new seller connection for generating a second registration
  const secondSellerConnection: api.IConnection = { host: connection.host };
  const secondSellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(secondSellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    });
  // Step 3: Test two invalid token scenarios
  // Test 1: Malformed token (contains invalid characters) - must be rejected
  const malformedToken = "invalid_token_with_invalid_ch@racters123";
  await TestValidator.error(
    "should reject malformed token with invalid characters",
    async () => {
      await api.functional.shoppingMall.seller.auth.sellers.email.verify(
        sellerConnection,
        {
          body: {
            token: malformedToken,
          } satisfies IShoppingMallSellerEmailVerification.IRequest,
        },
      );
    },
  );
  // Test 2: Token from different registration (using second seller's generated email but not the token)
  // Generate a token with valid format but from different registration
  const randomValidFormatToken = typia.random<
    string &
      tags.MinLength<32> &
      tags.MaxLength<128> &
      tags.Pattern<"^[a-zA-Z0-9-_]+$">
  >();
  await TestValidator.error(
    "should reject token from different seller registration",
    async () => {
      await api.functional.shoppingMall.seller.auth.sellers.email.verify(
        sellerConnection,
        {
          body: {
            token: randomValidFormatToken,
          } satisfies IShoppingMallSellerEmailVerification.IRequest,
        },
      );
    },
  );
  // Note: We cannot test token expiration or token reuse because we cannot access the verification token via API
  // The verification token is sent via email and we have no programmatic access to it in this E2E environment
  // The two test cases above (malformed format and unknown token) are the only authentic ways to test
  // token validation given the system constraints.
}
