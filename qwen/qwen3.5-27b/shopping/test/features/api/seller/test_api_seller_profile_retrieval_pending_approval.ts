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
 * Test profile retrieval for a seller with pending approval status.
 *
 * This test verifies that sellers with 'pending' approval status cannot
 * authenticate and access their profile. According to the specification,
 * only sellers with 'approved' status can login and access seller features.
 *
 * Test flow:
 * 1. Register a new seller account (defaults to 'pending' approval status)
 * 2. Attempt to login as the pending seller
 * 3. Verify login fails with HTTP 403 Forbidden status
 * 4. Confirm profile retrieval is blocked for pending sellers
 */
export async function test_api_seller_profile_retrieval_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const registeredSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(registeredSeller);
  // Verify the seller was created with 'pending' approval status
  TestValidator.equals(
    "seller approval status is pending",
    registeredSeller.approval_status,
    "pending",
  );
  // 2. Attempt to login as the pending seller
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login should fail with 403 for pending seller",
    403,
    async () => {
      await authorize_seller_login(loginConnection, {
        body: {
          email: registeredSeller.email,
          password: "1234",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );
  // 3. Verify that profile retrieval is also blocked for pending sellers
  // Since login failed, we cannot get a valid connection with auth token
  // Attempting profile retrieval without authentication should fail
  const profileConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "profile retrieval should fail without authentication",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.seller.profile.at(profileConnection);
    },
  );
}
