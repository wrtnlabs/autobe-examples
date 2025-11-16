import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test administrative access to seller session information.
 *
 * This test validates that the system properly handles admin and seller account
 * creation, which are prerequisites for session management. The original
 * scenario of retrieving a specific session by ID is not implementable without
 * a session listing endpoint or session ID being returned during seller
 * registration.
 *
 * Steps:
 *
 * 1. Create admin account with super_admin privileges
 * 2. Create seller account which generates an authentication session
 * 3. Validate both accounts were created successfully with proper authorization
 *    tokens
 */
export async function test_api_seller_session_admin_retrieval(
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
        href: "https://marketplace.example.com/admin/register",
        referrer: "https://marketplace.example.com/admin/login",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create seller account to generate a session
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        business_description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        store_name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 5,
        }),
        href: "https://marketplace.example.com/seller/register",
        referrer: "https://marketplace.example.com/seller/info",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 3: Validate account creation and authorization
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.equals(
    "admin level is super_admin",
    admin.admin_level,
    "super_admin",
  );
  TestValidator.equals("seller email matches", seller.email, sellerEmail);
  TestValidator.equals(
    "seller has valid store name",
    seller.store_name.length > 0,
    true,
  );

  // Note: The original scenario to retrieve session details cannot be implemented
  // because there is no API endpoint to list sessions and the session ID is not
  // returned in the seller registration response. A complete implementation would
  // require additional API endpoints or response data to obtain the session ID.
}
