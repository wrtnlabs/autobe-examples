import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_email_resend_successful(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller account with pending_verification status
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  TestValidator.equals(
    "seller status should be pending_verification",
    seller.status,
    "pending_verification",
  );
  // Step 2: Verify the seller is properly authenticated and has a valid access token
  TestValidator.predicate(
    "seller has valid access token",
    () => seller.access_token.length > 0,
  );
  TestValidator.predicate(
    "seller has valid refresh token",
    () => seller.refresh_token.length > 0,
  );
  // Step 3: Execute email resend operation using the same authenticated connection
  // The authorize_seller_join function already updated sellerConnection.headers with the token
  // We reuse this same connection to ensure proper authentication context for the resend
  await api.functional.shoppingMall.seller.auth.sellers.email.resend(
    sellerConnection,
  );
  // Step 4: Validate successful completion (204 No Content)
  // Since the API returns void on success, the successful completion without error
  // is the validation that the operation worked
  // No additional assertions needed as void return type confirms success
}
