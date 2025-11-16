import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test administrative forced termination of seller authentication sessions.
 *
 * This test validates that administrators have the elevated permissions to
 * access seller session management endpoints. It creates both admin and seller
 * accounts, then attempts to use admin credentials to call the session deletion
 * endpoint, demonstrating proper authorization controls for administrative
 * session management.
 *
 * Steps:
 *
 * 1. Create and authenticate as super admin with elevated permissions
 * 2. Create a seller account to establish the target seller context
 * 3. Admin attempts to terminate a seller session using DELETE endpoint
 * 4. Verify the API response structure and admin authorization is accepted
 */
export async function test_api_seller_session_forced_termination_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with super_admin privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 5 }),
        store_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 3: Admin attempts to terminate seller session
  // Note: Using generated session ID as actual session ID is not accessible from seller.join() response
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  const terminatedSession: IShoppingMallSellerSession =
    await api.functional.shoppingMall.seller.sellers.sessions.erase(
      connection,
      {
        sellerId: seller.id,
        sessionId: sessionId,
      },
    );
  typia.assert(terminatedSession);

  // Step 4: Verify terminated session structure and relationship
  TestValidator.equals(
    "session belongs to target seller",
    terminatedSession.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "session ID matches requested deletion",
    terminatedSession.id,
    sessionId,
  );
  TestValidator.predicate(
    "session has expiration timestamp",
    terminatedSession.expired_at !== null &&
      terminatedSession.expired_at !== undefined,
  );
}
