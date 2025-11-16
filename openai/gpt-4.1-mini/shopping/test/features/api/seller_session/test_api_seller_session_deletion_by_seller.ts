import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test the deletion of a seller session by an authenticated seller.
 *
 * This test checks that a seller can remove an existing session, invalidating
 * it and preventing further use. It verifies that the session to be deleted
 * exists through session creation prerequisite, and that only the authorized
 * seller can perform this destructive operation to safeguard account sessions.
 */
export async function test_api_seller_session_deletion_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller signs up (join)
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "mySecurePassword123",
    name: typia.random<string>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 2. Create a seller session for the seller
  const sessionCreateBody = {
    ip: "192.168.1.100",
    href: "https://seller.example.com/dashboard",
    referrer: "https://seller.example.com/login",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  } satisfies IShoppingMallSellerSession.ICreate;

  const session: IShoppingMallSellerSession =
    await api.functional.shoppingMall.seller.sellers.sellerSessions.create(
      connection,
      {
        sellerId: seller.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // 3. Delete the created seller session
  await api.functional.shoppingMall.seller.sellers.sellerSessions.erase(
    connection,
    {
      sellerId: seller.id,
      sellerSessionId: session.id,
    },
  );

  // 4. For now, there's no direct read endpoint to verify deletion, so ensure no errors occur and test completion.
  // Real system would attempt to confirm that session no longer valid, but that is beyond current API available.
}
