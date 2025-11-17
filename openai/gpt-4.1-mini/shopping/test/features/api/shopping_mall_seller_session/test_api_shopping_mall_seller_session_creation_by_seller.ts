import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_shopping_mall_seller_session_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Create a new seller account (Join)
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 2. Create a new session for this seller
  const sessionCreateBody = {
    href: `https://example.com/session/${typia.random<string & tags.Format<"uuid">>()}`,
    referrer: `https://example.com/referrer/${typia.random<string & tags.Format<"uuid">>()}`,
    ip: `${RandomGenerator.pick(["192.168.0.1", "10.0.0.1", "172.16.0.1"] as const)}`,
    user_agent: RandomGenerator.name(5),
    fingerprint: RandomGenerator.alphaNumeric(24),
  } satisfies IShoppingMallSellerSession.ICreate;

  const session: IShoppingMallSellerSession =
    await api.functional.shoppingMall.seller.shoppingMallSellers.shoppingMallSellerSessions.create(
      connection,
      {
        shoppingMallSellerId: typia.assert<string & tags.Format<"uuid">>(
          seller.id,
        ),
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  TestValidator.equals(
    "session created shoppingMallSellerId should match seller id",
    session.shoppingMallSellerId,
    seller.id,
  );
  TestValidator.predicate(
    "session href is a valid HTTPS URI",
    /^https:\/\/.+/.test(session.href),
  );
  TestValidator.predicate(
    "session referrer is a valid HTTPS URI",
    /^https:\/\/.+/.test(session.referrer),
  );
}
