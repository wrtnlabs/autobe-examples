import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Retrieve seller session details as admin, and validate access control.
 *
 * 1. Register new platform admin account (POST /auth/admin/join) to receive
 *    authorization token.
 * 2. Generate random sellerId and sessionId (simulate real-life UUIDs).
 * 3. As admin (authorized context), call GET
 *    /shoppingMall/admin/sellers/{sellerId}/sessions/{sessionId}.
 *
 *    - Assert API returns IShoppingMallSellerSession, incl. IP, href, referrer,
 *         created_at, expired_at, and nested seller summary (id,
 *         business_name).
 *    - Use typia.assert for schema validation.
 * 4. Create a new unauthenticated connection instance with empty headers.
 *
 *    - Call the same endpoint as unauthorized actor.
 *    - Must throw error (TestValidator.error) as only admins can access session
 *         details.
 */
export async function test_api_seller_session_details_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.MinLength<8> &
        tags.Format<"password">,
      name: RandomGenerator.name(2) as string & tags.MinLength<1>,
    },
  });
  typia.assert(adminJoin);

  // 2. Prepare random sellerId and sessionId (UUIDs as per schema)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 3. As admin, fetch session details for given seller/session
  const session = await api.functional.shoppingMall.admin.sellers.sessions.at(
    connection,
    {
      sellerId,
      sessionId,
    },
  );
  typia.assert(session);
  // Assert required schema
  TestValidator.predicate(
    "response has correct seller summary",
    typeof session.seller === "object" &&
      typeof session.seller.id === "string" &&
      typeof session.seller.business_name === "string",
  );
  TestValidator.predicate(
    "response has valid session fields",
    typeof session.ip === "string" &&
      typeof session.href === "string" &&
      typeof session.referrer === "string" &&
      typeof session.created_at === "string",
  );
  // expired_at is nullable, must be string or null/undefined
  if (session.expired_at !== null && session.expired_at !== undefined) {
    TestValidator.predicate(
      "expired_at is string when present",
      typeof session.expired_at === "string",
    );
  }

  // 4. Unauthenticated connection (empty headers)
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized cannot access seller session details",
    async () => {
      await api.functional.shoppingMall.admin.sellers.sessions.at(unauthConn, {
        sellerId,
        sessionId,
      });
    },
  );
}
