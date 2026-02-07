import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_email_verification_retrieval_verified_tokens(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceSeller.IJoin,
  });
  // 2. Retrieve verified email verification tokens
  const verifiedTokens =
    await api.functional.ecommerce.seller.seller_email_verifications.index(
      sellerConnection,
      {
        body: {
          is_verified: true,
          expires_at_min: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IEcommerceSellerEmailVerification.IRequest,
      },
    );
  typia.assert(verifiedTokens);
  // 3. Validate response structure and content
  TestValidator.equals(
    "Pagination metadata present",
    verifiedTokens.pagination.records,
    verifiedTokens.data.length,
  );
  // 4. Verify all returned tokens are verified
  verifiedTokens.data.forEach((token) => {
    TestValidator.equals("Token is verified", token.is_verified, true);
    // Verify token is within the last 7 days based on its expires_at
    const tokenDate = new Date(token.expires_at);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    TestValidator.predicate(
      "Token expiration within last 7 days",
      tokenDate > sevenDaysAgo,
    );
    // Verify seller association
    TestValidator.equals("Seller association", token.seller.id, seller.id);
  });
  // 5. Validate minimum response structure
  TestValidator.predicate(
    "At least one verified token found",
    verifiedTokens.data.length > 0,
  );
}
