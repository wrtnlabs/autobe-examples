import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller profile retrieval after registration and login.
 *
 * 1. Register a new seller account with valid credentials
 * 2. Authenticate the seller using login endpoint
 * 3. Retrieve seller profile information
 * 4. Validate profile data structure and security compliance
 */
export async function test_api_seller_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const registrationPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: registrationPassword,
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinResult);
  // 2. Authenticate the seller using login endpoint with SAME password
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: registrationPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResult);
  // 3. Retrieve seller profile information
  // loginConnection.headers is already set by authorize_seller_login
  const profile =
    await api.functional.shoppingMall.seller.profile.at(loginConnection);
  typia.assert(profile);
  // 4. Validate business logic (not type validation - typia.assert already did that)
  TestValidator.equals(
    "profile email matches registration",
    profile.email,
    joinResult.email,
  );
  TestValidator.predicate(
    "account status is active",
    profile.status === "active",
  );
  TestValidator.equals("account is not deleted", profile.deleted_at, null);
  TestValidator.predicate(
    "display_name is not empty",
    profile.display_name.length > 0,
  );
}
