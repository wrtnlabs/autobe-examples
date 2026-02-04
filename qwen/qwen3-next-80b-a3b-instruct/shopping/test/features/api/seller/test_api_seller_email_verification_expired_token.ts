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
export async function test_api_seller_email_verification_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register seller to initialize email verification system
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerResponse = await authorize_seller_join(connection, {
    body: sellerCredentials,
  });
  typia.assert(sellerResponse);
  // Step 2: Create a connection for verification
  const verificationConnection: api.IConnection = { host: connection.host };
  // Step 3: Create a valid-formatted token that is not actually registered
  // This represents an expired or invalid token in the system
  const invalidToken = typia.random<
    string &
      tags.MinLength<32> &
      tags.MaxLength<128> &
      tags.Pattern<"^[a-zA-Z0-9-_]+$">
  >();
  // Step 4: Attempt verification with invalid/experimental token
  // System should reject non-existent/expired tokens with 400 error
  await TestValidator.httpError(
    "expired verification token rejected with 400 error",
    400,
    async () => {
      await api.functional.shoppingMall.seller.auth.sellers.email.verify(
        verificationConnection,
        {
          body: {
            token: invalidToken,
          } satisfies IShoppingMallSellerEmailVerification.IRequest,
        },
      );
    },
  );
}
