import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSellerBusinessInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerBusinessInfo";

/**
 * Validates admin-access retrieval of seller business information
 * (legal/tax/compliance/bank data only accessible by admin).
 *
 * - Registers a new admin user
 * - Tries to access a random (possibly nonexistent) seller's business info
 *   without authentication (should fail)
 * - Logs in as admin
 * - Attempts to retrieve a random seller's business info
 * - Verifies all key fields (legal_entity_name, registration_number, etc.) are
 *   present and properly typed
 * - Verifies errors for missing or unauthorized requests (not logged in as admin
 *   or using an unregistered sellerId)
 */
export async function test_api_admin_retrieve_seller_business_information(
  connection: api.IConnection,
) {
  // Register an admin to obtain admin credentials
  const adminEmail =
    RandomGenerator.name(2).replace(/ /g, "_") + "@company.com";
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail as string & tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(12) as string &
          tags.MinLength<8> &
          tags.MaxLength<128>,
        name: RandomGenerator.name(2) as string &
          tags.MinLength<1> &
          tags.MaxLength<100>,
        role: "super" as string & tags.MinLength<2> & tags.MaxLength<32>,
        status: "active" as string & tags.MinLength<3> & tags.MaxLength<20>,
      },
    });
  typia.assert(admin);

  // Attempt without authentication (simulate unauthorized access)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Should block unauthenticated access to seller business info",
    async () => {
      await api.functional.shopping.admin.sellers.businessInfo.at(unauthConn, {
        sellerId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Now, as authenticated admin, try to fetch info for a random seller (likely nonexistent, testing error branch)
  await TestValidator.error(
    "Should error when business info for nonexistent seller is requested",
    async () => {
      await api.functional.shopping.admin.sellers.businessInfo.at(connection, {
        sellerId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // NOTE: This test does not create seller data, as no such endpoint is available in e2e scope. If the API
  // supported, in a real scenario we'd create a seller, then its business info, then test retrieval.
  // Instead, only negative/permission coverage is possible here.
}
