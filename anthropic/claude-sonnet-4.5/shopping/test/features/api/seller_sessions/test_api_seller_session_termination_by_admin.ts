import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test admin's ability to terminate a seller authentication session.
 *
 * This test validates the administrative function of forcibly logging out
 * sellers for security or administrative purposes. The workflow involves:
 *
 * 1. Create a seller account and establish an active authentication session
 * 2. Create an admin account with appropriate privileges
 * 3. Admin terminates the seller's session by session ID
 * 4. Verify the session termination returns correct session information
 *
 * This ensures admins can manage seller sessions for security enforcement,
 * policy violations, or emergency access revocation scenarios.
 */
export async function test_api_seller_session_termination_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create seller account and establish authentication session
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const sellerData = {
    email: sellerEmail,
    password: sellerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    business_description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 2: Create admin account to gain administrative privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const adminLevels = ["super_admin", "moderator", "support"] as const;
  const adminLevel = RandomGenerator.pick(adminLevels);

  const adminData = {
    email: adminEmail,
    password: adminPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: adminLevel,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 3: Generate a session ID for testing
  // Note: The available APIs do not provide a session listing endpoint to retrieve
  // the actual session ID created during seller authentication. In a production scenario,
  // there would be an endpoint to list active sessions. For this test, we use a random
  // UUID which may result in a 404 response if the session doesn't exist.
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Admin terminates the seller's session
  const deletedSession =
    await api.functional.shoppingMall.admin.sellers.sessions.erase(connection, {
      sellerId: seller.id,
      sessionId: sessionId,
    });
  typia.assert(deletedSession);

  // Step 5: Verify the deleted session information
  TestValidator.equals(
    "deleted session seller ID matches",
    deletedSession.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "deleted session ID matches",
    deletedSession.id,
    sessionId,
  );
}
