import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test retrieval of seller accounts in pending status awaiting administrative
 * approval.
 *
 * This test validates that admins can view newly registered sellers who have
 * not yet been approved for marketplace participation. The test confirms that
 * sellers in pending status have all their registration information accessible
 * to admins for review, and that the status field correctly shows 'pending'.
 * This scenario is critical for the seller approval workflow where admins need
 * to evaluate new seller applications before granting marketplace access.
 *
 * Workflow:
 *
 * 1. Create and authenticate an admin account
 * 2. Register a new seller account (starts in pending status by default)
 * 3. Admin retrieves the seller details by seller ID
 * 4. Validate that retrieved seller data matches registration data
 * 5. Verify the status field is "pending"
 */
export async function test_api_seller_detail_retrieval_pending_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "moderator" as const,
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Register a new seller account (defaults to pending status)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const sellerData = {
    email: sellerEmail,
    password: sellerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 3: Admin retrieves the seller details
  const retrievedSeller = await api.functional.shoppingMall.admin.sellers.at(
    connection,
    {
      sellerId: seller.id,
    },
  );
  typia.assert(retrievedSeller);

  // Step 4: Validate retrieved seller data matches registration data
  TestValidator.equals(
    "seller email matches",
    retrievedSeller.email,
    sellerData.email,
  );
  TestValidator.equals(
    "seller full_name matches",
    retrievedSeller.full_name,
    sellerData.full_name,
  );
  TestValidator.equals(
    "seller phone_number matches",
    retrievedSeller.phone_number,
    sellerData.phone_number,
  );
  TestValidator.equals(
    "seller business_name matches",
    retrievedSeller.business_name,
    sellerData.business_name,
  );
  TestValidator.equals(
    "seller business_description matches",
    retrievedSeller.business_description,
    sellerData.business_description,
  );
  TestValidator.equals(
    "seller store_name matches",
    retrievedSeller.store_name,
    sellerData.store_name,
  );
  TestValidator.equals("seller id matches", retrievedSeller.id, seller.id);

  // Step 5: Verify the status is "pending"
  TestValidator.equals(
    "seller status is pending",
    retrievedSeller.status,
    "pending",
  );
}
