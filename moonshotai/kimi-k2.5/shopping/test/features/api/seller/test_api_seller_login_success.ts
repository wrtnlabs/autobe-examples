import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
  // 1. Create seller account first with random credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Login with valid credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(authorized);
  // 3. Validate business logic
  TestValidator.equals("email matches", authorized.email, email);
  TestValidator.equals("id matches", authorized.id, seller.id);
  TestValidator.predicate(
    "token has future expiration",
    new Date(authorized.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "token has future refreshable date",
    new Date(authorized.token.refreshable_until) > new Date(),
  );
}
