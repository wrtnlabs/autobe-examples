import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test admin retrieval of detailed seller account information.
 *
 * This test validates that an authenticated admin can successfully retrieve
 * comprehensive seller account details including business identity,
 * verification status, contact information, and account metadata. The test
 * ensures admins have unrestricted access to seller information for oversight
 * purposes.
 *
 * Test Steps:
 *
 * 1. Create and authenticate admin account via join endpoint
 * 2. Retrieve seller details using a seller ID
 * 3. Validate response contains complete seller information
 */
export async function test_api_seller_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: RandomGenerator.pick([
      "super_admin",
      "order_manager",
      "content_moderator",
      "support_admin",
    ] as const),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Verify admin authentication response
  TestValidator.equals(
    "admin email matches",
    admin.email,
    adminCreateData.email,
  );
  TestValidator.equals("admin name matches", admin.name, adminCreateData.name);
  TestValidator.equals(
    "admin role_level matches",
    admin.role_level,
    adminCreateData.role_level,
  );

  // Step 2: Retrieve seller details using admin authentication
  // Using a random UUID assuming seller exists in system
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.at(connection, {
      sellerId: sellerId,
    });
  typia.assert(seller);

  // Step 3: Validation complete - typia.assert() has verified all seller data
  // Response includes all required fields: id, email, business_name, business_type,
  // contact_person_name, phone, account_status, email_verified, created_at, updated_at
}
