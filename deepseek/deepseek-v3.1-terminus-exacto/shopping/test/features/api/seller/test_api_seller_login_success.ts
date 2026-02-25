import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // Create seller account using utility function
  const password = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // Test login with same credentials using utility function
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_seller_login(loginConnection, {
    body: {
      email: seller.email,
      password: password,
    } satisfies IEcommerceSeller.ILogin,
  });
  typia.assert(loginResponse);
  // Validate login response
  TestValidator.equals("seller ID should match", loginResponse.id, seller.id);
  TestValidator.equals("email should match", loginResponse.email, seller.email);
  TestValidator.equals(
    "shop name should match",
    loginResponse.shop_name,
    seller.shop_name,
  );
  TestValidator.predicate(
    "account status should be approved",
    loginResponse.account_status === "approved",
  );
  TestValidator.predicate(
    "token should be present",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    loginResponse.token.refresh.length > 0,
  );
  // Validate token expiration timestamps
  const now = new Date();
  const expiredAt = new Date(loginResponse.token.expired_at);
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);
  TestValidator.predicate(
    "token expiration should be in future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refreshable until should be in future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable until should be after token expiration",
    refreshableUntil > expiredAt,
  );
}