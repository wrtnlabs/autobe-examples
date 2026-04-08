import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller token refresh fails with invalid or non-existent refresh token.
 *
 * Validates that the seller refresh token endpoint properly rejects invalid or non-existent refresh tokens with HTTP 401 Unauthorized. This security test ensures that fabricated tokens cannot be used to extend sessions or gain unauthorized access.
 *
 * The test registers a seller account to establish a valid session context, then attempts to refresh the token using a completely fake refresh token string that was never issued by the system. The expected behavior is rejection with 401 Unauthorized status.
 *
 * 1. Register a new seller account via POST /ecommerce/auth/seller/join
 * 2. Attempt to refresh token with invalid refresh token string
 * 3. Verify HTTP 401 Unauthorized response is returned
 * 4. Confirm no new tokens are generated for invalid refresh attempts
 */
export async function test_api_seller_refresh_token_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account to establish valid session context
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(authorizedSeller);
  // 2. Attempt to refresh token with invalid refresh token
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "seller refresh with invalid token should return 401 Unauthorized",
    401,
    async () => {
      await authorize_seller_refresh(invalidRefreshConnection, {
        body: {
          refresh_token: "invalid_refresh_token_xyz123",
        } satisfies IEcommerceSeller.IRefresh,
      });
    },
  );
}
