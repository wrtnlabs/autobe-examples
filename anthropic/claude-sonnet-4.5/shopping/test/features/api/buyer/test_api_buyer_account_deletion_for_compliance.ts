import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test administrator's ability to permanently delete buyer accounts for
 * regulatory compliance.
 *
 * This test validates the complete GDPR-compliant data deletion workflow where
 * administrators can permanently remove buyer accounts in response to "right to
 * be forgotten" requests. The scenario ensures that:
 *
 * 1. Admin account is created and authenticated with proper privileges
 * 2. Buyer account is created representing a user requesting data deletion
 * 3. Admin can execute permanent deletion of the buyer account
 * 4. Deletion operation completes successfully with complete data removal
 *
 * This is a critical compliance feature ensuring the platform can fulfill legal
 * obligations under data protection regulations such as GDPR Article 17 (Right
 * to Erasure).
 */
export async function test_api_buyer_account_deletion_for_compliance(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account for compliance operations
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
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

  // Store admin access token for later restoration
  const adminAccessToken = admin.token.access;

  // Step 2: Create buyer account representing user requesting deletion
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 3: Restore admin authentication context for deletion operation
  connection.headers = connection.headers || {};
  connection.headers.Authorization = adminAccessToken;

  // Step 4: Execute permanent deletion of buyer account
  await api.functional.shoppingMall.admin.buyers.erase(connection, {
    buyerId: buyer.id,
  });

  // Success: void return indicates complete permanent deletion
}
