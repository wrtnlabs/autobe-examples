import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_password_reset_token_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account for password reset process
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAccount = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceSeller.IJoin,
  });
  // 2. Get a reset ID (in a real implementation, this would come from the password reset request)
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve password reset token details
  const token = await api.functional.ecommerce.seller.seller_password_resets.at(
    connection,
    {
      resetId: resetId,
    },
  );
  typia.assert(token);
  // 4. Validate token details
  TestValidator.equals(
    "token should link to seller account",
    token.seller.id,
    sellerAccount.id,
  );
  TestValidator.predicate("token should not have expired", () => {
    const now = new Date();
    const expiresAt = new Date(token.expires_at);
    return expiresAt > now;
  });
}
