import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  // Step 1: Create a seller account using utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(joinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinResult);
  // Step 2: Login with the seller credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResult);
  // Step 3: Validate login response matches join data
  TestValidator.equals("email matches", loginResult.email, sellerEmail);
  TestValidator.equals(
    "shop name matches",
    loginResult.shop_name,
    joinResult.shop_name,
  );
  TestValidator.equals(
    "approval status",
    loginResult.approval_status,
    "PENDING",
  );
  // Step 4: Validate approvedByAdmin is null for PENDING status
  TestValidator.equals(
    "approvedByAdmin is null for PENDING",
    loginResult.approvedByAdmin,
    null,
  );
  // Step 5: Validate token has required fields (typia.assert validates types)
  TestValidator.predicate(
    "access token is non-empty",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loginResult.token.refresh.length > 0,
  );
  // Step 6: Validate expired_at is in the future
  const expiredAt = new Date(loginResult.token.expired_at);
  const now = new Date();
  TestValidator.predicate("access token expires in future", expiredAt > now);
  // Step 7: Validate refreshable_until is after expired_at
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil >= expiredAt,
  );
}
