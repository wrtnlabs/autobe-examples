import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_password_reset_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication setup
  const sellerConnection: api.IConnection = { host: connection.host };
  // Join seller account
  const sellerJoined = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoined);
  // Login to get fresh authorization
  const sellerLoggedIn = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoined.email,
      password: sellerJoined.token.access, // Use the token as password (simulated)
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLoggedIn);
  // Create a new connection with the logged-in seller's token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedSellerConnection.headers = {
    ...authenticatedSellerConnection.headers,
    Authorization: sellerLoggedIn.token.access,
  };
  // 2. Create a password reset token record with expired_at in the past
  const expiredTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  const passwordResetToken =
    await api.functional.ecommerceMall.seller.password_resets.at(
      authenticatedSellerConnection,
      {
        resetId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(passwordResetToken);
  // 3. Validate the token record
  TestValidator.equals(
    "expired_at timestamp",
    passwordResetToken.expired_at,
    expiredTime.toISOString(),
  );
  TestValidator.predicate(
    "expired_at is in the past",
    new Date(passwordResetToken.expired_at) < new Date(),
  );
}