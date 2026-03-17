import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_seller_login_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account (approval_status will be 'pending' by default)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const registeredSeller: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: sellerPassword,
        shop_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(registeredSeller);
  // 2. Verify initial approval status is 'pending'
  TestValidator.equals(
    "initial approval status is pending",
    registeredSeller.approval_status,
    "pending",
  );
  // 3. Login with the registered seller credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_login(loginConnection, {
      body: {
        email: registeredSeller.seller.email,
        password: sellerPassword,
      } satisfies IEcommerceMallSeller.ILogin,
    });
  typia.assert(loginResponse);
  // 4. Validate login response maintains pending status
  TestValidator.equals(
    "login response approval status is pending",
    loginResponse.approval_status,
    "pending",
  );
  // 5. Validate seller information matches
  TestValidator.equals(
    "seller email matches",
    loginResponse.seller.email,
    registeredSeller.seller.email,
  );
  TestValidator.equals(
    "seller shop name matches",
    loginResponse.shop_name,
    registeredSeller.shop_name,
  );
  // 6. Validate authorization tokens are present
  TestValidator.predicate(
    "access token exists",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expiration",
    new Date(loginResponse.token.expired_at) > new Date(),
  );
}
